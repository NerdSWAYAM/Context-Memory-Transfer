import { ProviderAdapter, NormalizedConversation, ChatMessage } from '../../shared/types';
import { ApiCaptureResponse } from '../../shared/messages';
import { scrollToTopToLoadHistory } from '../scroll-engine';

// ─── Provider-internal types — never exported ───────────────────────────────

interface ClaudeApiConversation {
  uuid?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  chat_messages?: ClaudeApiMessage[];
}

interface ClaudeApiMessage {
  uuid?: string;
  sender?: 'human' | 'assistant';
  text?: string;
  content?: ClaudeContentBlock[];
  created_at?: string;
  updated_at?: string;
}

interface ClaudeContentBlock {
  type?: string;
  text?: string;
}

// ─── Parsing ────────────────────────────────────────────────────────────────

function extractClaudeMessageText(msg: ClaudeApiMessage): string {
  // Try content blocks first (newer format)
  if (msg.content && Array.isArray(msg.content)) {
    const texts = msg.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text!);
    if (texts.length > 0) return texts.join('\n').trim();
  }
  // Fall back to top-level text field
  if (typeof msg.text === 'string') return msg.text.trim();
  return '';
}

function parseClaudeApiResponse(
  conversationId: string,
  data: unknown
): NormalizedConversation {
  const raw = data as ClaudeApiConversation;
  const apiMessages = raw.chat_messages ?? [];

  const messages: ChatMessage[] = [];

  for (const apiMsg of apiMessages) {
    const role = apiMsg.sender === 'human' ? 'user' : apiMsg.sender === 'assistant' ? 'assistant' : null;
    if (!role) continue;

    const text = extractClaudeMessageText(apiMsg);
    if (!text) continue;

    const timestamp = apiMsg.created_at
      ? new Date(apiMsg.created_at).getTime()
      : Date.now();

    messages.push({
      id: apiMsg.uuid ?? crypto.randomUUID(),
      role,
      text,
      timestamp,
      chatId: conversationId,
    });
  }

  return {
    id: conversationId,
    provider: 'claude',
    title: raw.name?.trim() || document.title || 'Claude Conversation',
    messages,
    capturedAt: Date.now(),
    embedding: null,
  };
}

// ─── DOM extraction helpers ─────────────────────────────────────────────────

function extractClaudeDomMessages(conversationId: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const seenIds = new Set<string>();

  // Claude uses [data-testid] patterns for message containers
  // Human messages: div.font-user-message or [data-testid*="human"]
  // Assistant messages: div.font-claude-message or [data-testid*="assistant"]
  const messageContainers = document.querySelectorAll(
    '[class*="font-user-message"], [class*="font-claude-message"], ' +
    '[data-testid*="human-turn"], [data-testid*="ai-turn"], ' +
    '.contents .group'
  );

  if (messageContainers.length === 0) {
    // Broader fallback: look for alternating conversation blocks
    const turns = document.querySelectorAll('[class*="min-h-"]');
    turns.forEach((turn, index) => {
      const text = (turn as HTMLElement).innerText?.trim();
      if (!text) return;
      const id = `claude_dom_${index}`;
      if (seenIds.has(id)) return;
      seenIds.add(id);
      messages.push({
        id,
        role: index % 2 === 0 ? 'user' : 'assistant',
        text,
        timestamp: Date.now(),
        chatId: conversationId,
      });
    });
    return messages;
  }

  messageContainers.forEach((container, index) => {
    const el = container as HTMLElement;
    const text = el.innerText?.trim();
    if (!text) return;

    const id = `claude_dom_${index}`;
    if (seenIds.has(id)) return;
    seenIds.add(id);

    // Determine role from class names or testids
    const classList = el.className || '';
    const testId = el.getAttribute('data-testid') || '';
    let role: 'user' | 'assistant' = 'assistant';

    if (
      classList.includes('font-user-message') ||
      testId.includes('human')
    ) {
      role = 'user';
    }

    messages.push({ id, role, text, timestamp: Date.now(), chatId: conversationId });
  });

  return messages;
}

// ─── Adapter ────────────────────────────────────────────────────────────────

export class ClaudeAdapter implements ProviderAdapter {
  provider = 'claude';

  detect(): boolean {
    return window.location.hostname === 'claude.ai';
  }

  getConversationId(): string | null {
    // URL pattern: /chat/{uuid}
    const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  async fetchFullConversation(id: string): Promise<NormalizedConversation> {
    console.log(`[Provider] ClaudeAdapter requesting API capture for ${id}`);

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'REQUEST_API_CAPTURE',
          payload: {
            provider: this.provider,
            id,
            apiBase: window.location.origin,
          },
        },
        (response: ApiCaptureResponse) => {
          if (chrome.runtime.lastError) {
            console.error('[API] Message error:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response?.success) {
            try {
              const conversation = parseClaudeApiResponse(id, response.data);
              console.log(`[API] Parsed ${conversation.messages.length} messages from Claude API`);
              if (conversation.messages.length === 0) {
                reject(new Error('Claude API returned no user/assistant messages'));
                return;
              }
              resolve(conversation);
            } catch (parseError) {
              console.error('[API] Failed to parse Claude API response');
              reject(parseError instanceof Error ? parseError : new Error(String(parseError)));
            }
          } else {
            console.error('[API] Claude API fetch failed:', response?.error);
            reject(new Error(response?.error || 'Unknown API error'));
          }
        }
      );
    });
  }

  async extractFromDom(): Promise<NormalizedConversation> {
    console.log('[Fallback] ClaudeAdapter initiating DOM fallback');

    const scrollContainer =
      document.querySelector('[class*="overflow-y-auto"]') ??
      document.querySelector('main') ??
      document.documentElement;

    await scrollToTopToLoadHistory(scrollContainer);

    const conversationId = this.getConversationId() ?? `claude_temp_${crypto.randomUUID()}`;
    const messages = extractClaudeDomMessages(conversationId);

    return {
      id: conversationId,
      provider: this.provider,
      title: document.title || 'Claude Conversation',
      messages,
      capturedAt: Date.now(),
      embedding: null,
    };
  }
}
