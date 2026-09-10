import { detectProvider } from './detector';
import { NormalizedConversation, ChatMessage } from '../shared/types';
import {
  CaptureProgress,
  CaptureResult,
  SaveConversationResponse,
} from '../shared/messages';
import { MutationWatcher } from './mutation-watcher';
import { extractMessageFromNode } from './dom-extractor';

function reportProgress(progress: CaptureProgress): void {
  chrome.runtime.sendMessage({ type: 'CAPTURE_PROGRESS', progress }).catch(() => { });
}

export class ConversationCaptureOrchestrator {
  private watcher: MutationWatcher;

  constructor() {
    this.watcher = new MutationWatcher((node) => {
      const adapter = detectProvider();
      const conversationId = adapter.getConversationId();
      const msg = extractMessageFromNode(node, conversationId ?? undefined);
      if (!msg || !conversationId) return;

      chrome.runtime.sendMessage({
        type: 'NEW_CHAT_MESSAGE',
        payload: {
          message: msg,
          conversation: {
            nativeId: conversationId,
            platform: adapter.provider,
            title: document.title,
          },
        },
      });
    });
  }

  public initPassiveCapture(): void {
    this.watcher.start();
  }

  public async triggerManualCapture(): Promise<CaptureResult> {
    console.log('[Capture] Orchestration started');
    reportProgress({ stage: 'detect', message: 'Detecting provider…' });

    const adapter = detectProvider();
    console.log(`[Provider] Detected: ${adapter.provider}`);

    const conversationId = adapter.getConversationId();
    if (!conversationId) {
      const error = 'No conversation ID found on this page';
      console.warn(`[Capture] ${error}`);
      reportProgress({ stage: 'error', message: error, provider: adapter.provider });
      return { success: false, provider: adapter.provider, error };
    }

    console.log(`[Capture] Conversation ID: ${conversationId}`);
    reportProgress({
      stage: 'detect',
      message: `Detected ${adapter.provider} conversation`,
      provider: adapter.provider,
      conversationId,
    });

    let conversation: NormalizedConversation;
    let usedFallback = false;

    try {
      reportProgress({
        stage: 'api',
        message: 'Fetching full conversation via API…',
        provider: adapter.provider,
        conversationId,
      });
      conversation = await adapter.fetchFullConversation(conversationId);
      console.log(`[Capture] API capture successful (${conversation.messages.length} messages)`);
    } catch (apiError) {
      const reason = apiError instanceof Error ? apiError.message : String(apiError);
      console.warn('[API] API capture failed, falling back to DOM extraction:', reason);
      usedFallback = true;

      reportProgress({
        stage: 'fallback',
        message: 'API failed — using DOM scroll + extraction…',
        provider: adapter.provider,
        conversationId,
        usedFallback: true,
      });

      try {
        conversation = await adapter.extractFromDom();
        console.log(`[Fallback] DOM extraction completed (${conversation.messages.length} messages)`);
      } catch (domError) {
        const domReason = domError instanceof Error ? domError.message : String(domError);
        console.error('[Capture] Both API and DOM extraction failed:', domReason);
        reportProgress({
          stage: 'error',
          message: domReason,
          provider: adapter.provider,
          conversationId,
          usedFallback: true,
        });
        return {
          success: false,
          provider: adapter.provider,
          conversationId,
          usedFallback: true,
          error: domReason,
        };
      }
    }

    const { conversation: deduped, duplicateCount } = this.deduplicate(conversation);
    reportProgress({
      stage: 'dedup',
      message:
        duplicateCount > 0
          ? `Removed ${duplicateCount} duplicate message(s)`
          : 'No duplicates found',
      provider: deduped.provider,
      conversationId: deduped.id,
      messageCount: deduped.messages.length,
      duplicateCount,
      usedFallback,
    });

    const validation = this.validate(deduped);
    reportProgress({
      stage: 'validate',
      message: validation.valid
        ? `Validated ${deduped.messages.length} messages`
        : validation.reason ?? 'Validation failed',
      provider: deduped.provider,
      conversationId: deduped.id,
      messageCount: deduped.messages.length,
      usedFallback,
    });

    if (!validation.valid) {
      console.error('[Validate] Validation failed:', validation.reason);
      return {
        success: false,
        provider: deduped.provider,
        conversationId: deduped.id,
        messageCount: deduped.messages.length,
        usedFallback,
        duplicateCount,
        error: validation.reason,
      };
    }

    try {
      await this.saveConversation(deduped);
    } catch (saveError) {
      const saveReason = saveError instanceof Error ? saveError.message : String(saveError);
      reportProgress({
        stage: 'error',
        message: saveReason,
        provider: deduped.provider,
        conversationId: deduped.id,
        usedFallback,
      });
      return {
        success: false,
        provider: deduped.provider,
        conversationId: deduped.id,
        messageCount: deduped.messages.length,
        usedFallback,
        duplicateCount,
        error: saveReason,
      };
    }

    reportProgress({
      stage: 'done',
      message: `Saved ${deduped.messages.length} messages`,
      provider: deduped.provider,
      conversationId: deduped.id,
      messageCount: deduped.messages.length,
      duplicateCount,
      usedFallback,
    });

    return {
      success: true,
      provider: deduped.provider,
      conversationId: deduped.id,
      messageCount: deduped.messages.length,
      usedFallback,
      duplicateCount,
    };
  }

  private deduplicate(conv: NormalizedConversation): {
    conversation: NormalizedConversation;
    duplicateCount: number;
  } {
    console.log('[Dedup] Starting deduplication');
    const uniqueMessages: ChatMessage[] = [];
    const seenIds = new Set<string>();
    const seenContentKeys = new Set<string>();

    for (const msg of conv.messages) {
      const contentKey = `${msg.role}:${msg.text}`;
      if (seenIds.has(msg.id) || seenContentKeys.has(contentKey)) {
        continue;
      }
      seenIds.add(msg.id);
      seenContentKeys.add(contentKey);
      uniqueMessages.push(msg);
    }

    const duplicateCount = conv.messages.length - uniqueMessages.length;
    console.log(`[Dedup] Removed ${duplicateCount} duplicates`);
    return { conversation: { ...conv, messages: uniqueMessages }, duplicateCount };
  }

  private validate(conv: NormalizedConversation): { valid: boolean; reason?: string } {
    console.log('[Validate] Validating conversation');

    if (!conv.id || !conv.provider) {
      const reason = 'Missing conversation ID or provider';
      console.error(`[Validate] ${reason}`);
      return { valid: false, reason };
    }

    if (!conv.messages.length) {
      const reason = 'Conversation has no messages';
      console.error(`[Validate] ${reason}`);
      return { valid: false, reason };
    }

    const invalidMessage = conv.messages.find(
      (msg) => !msg.id || !msg.role || !msg.text?.trim()
    );
    if (invalidMessage) {
      const reason = 'Conversation contains invalid or empty messages';
      console.error(`[Validate] ${reason}`);
      return { valid: false, reason };
    }

    console.log(`[Validate] Passed (${conv.messages.length} messages)`);
    return { valid: true };
  }

  private async saveConversation(conversation: NormalizedConversation): Promise<void> {
    console.log(`[Storage] Sending conversation ${conversation.id} to background`);
    reportProgress({
      stage: 'storage',
      message: 'Saving to Dexie…',
      provider: conversation.provider,
      conversationId: conversation.id,
      messageCount: conversation.messages.length,
    });

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'SAVE_CONVERSATION', payload: { conversation } },
        (response: SaveConversationResponse) => {
          if (chrome.runtime.lastError) {
            console.error('[Storage] Background communication failed:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response?.success) {
            console.log(`[Storage] Saved ${conversation.messages.length} messages`);
            resolve();
          } else {
            console.error('[Storage] Failed to save conversation:', response?.error);
            reject(new Error(response?.error || 'Save failed'));
          }
        }
      );
    });
  }
}

const orchestrator = new ConversationCaptureOrchestrator();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRIGGER_CAPTURE') {
    orchestrator
      .triggerManualCapture()
      .then((result) => sendResponse(result))
      .catch((error: Error) =>
        sendResponse({ success: false, error: error.message ?? String(error) })
      );
    return true;
  }

  if (message.type === 'GET_CONVERSATION_INFO') {
    const adapter = detectProvider();
    sendResponse({
      nativeId: adapter.getConversationId(),
      platform: adapter.provider,
      title: document.title,
    });
    return false;
  }

  if (message.type === 'INJECT_AND_SEND') {
    const text: string = message.payload?.text ?? '';
    injectTextAndSend(text);
    sendResponse({ success: true });
    return false;
  }

  return false;
});

/**
 * Finds the chat input on the current page, injects the given text,
 * and triggers the send button / Enter key.
 */
function injectTextAndSend(text: string): void {
  const selectors = [
    '#prompt-textarea',                        // ChatGPT
    'div[contenteditable="true"].ProseMirror', // Claude
    'div[contenteditable="true"]',             // Gemini / generic
    'textarea',                                // DeepSeek / fallback
  ];

  let input: HTMLElement | null = null;
  for (const sel of selectors) {
    input = document.querySelector(sel);
    if (input) break;
  }

  if (!input) {
    console.error('[Transfer] Could not find chat input on this page.');
    return;
  }

  // For contenteditable divs
  if (input.getAttribute('contenteditable') === 'true') {
    input.focus();
    input.innerHTML = '';
    const lines = text.split('\n');
    lines.forEach((line) => {
      const p = document.createElement('p');
      p.textContent = line || '\u200B';
      input!.appendChild(p);
    });
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (input instanceof HTMLTextAreaElement) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Auto-send: find and click the send button after a short delay
  setTimeout(() => {
    const sendSelectors = [
      'button[data-testid="send-button"]',     // ChatGPT
      'button[aria-label="Send Message"]',     // Claude
      'button.send-button',                    // Gemini
      'button[aria-label="Send"]',             // generic
      'button[type="submit"]',                 // DeepSeek / generic
    ];

    let sendBtn: HTMLButtonElement | null = null;
    for (const sel of sendSelectors) {
      sendBtn = document.querySelector(sel);
      if (sendBtn && !sendBtn.disabled) break;
    }

    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      // Try pressing Enter as a last resort
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      input!.dispatchEvent(enterEvent);
    }
  }, 300);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => orchestrator.initPassiveCapture());
} else {
  orchestrator.initPassiveCapture();
}
