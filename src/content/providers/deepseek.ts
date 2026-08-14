import { ProviderAdapter, NormalizedConversation, ChatMessage } from '../../shared/types';
import { ApiCaptureResponse } from '../../shared/messages';
import { scrollToTopToLoadHistory } from '../scroll-engine';

// ─── Provider-internal types — never exported ───────────────────────────────

interface DeepSeekApiResponse {
  data?: {
    biz_data?: {
      chat_session?: DeepSeekSession;
      chat_messages?: DeepSeekApiMessage[];
    };
  };
}

interface DeepSeekSession {
  id?: string;
  title?: string;
}

interface DeepSeekApiMessage {
  message_id?: string | number;
  parent_id?: string | number;
  role?: string;           // 'USER' | 'ASSISTANT'
  content?: string;
  inserted_at?: string;
}

// ─── Parsing ────────────────────────────────────────────────────────────────

function parseDeepSeekApiResponse(
  conversationId: string,
  data: unknown
): NormalizedConversation {
  const raw = data as DeepSeekApiResponse;

  // Try the nested biz_data structure
  const session = raw.data?.biz_data?.chat_session;
  let apiMessages = raw.data?.biz_data?.chat_messages;

  // If the top-level data directly contains messages
  if (!apiMessages && Array.isArray((data as Record<string, unknown>).messages)) {
    apiMessages = (data as Record<string, unknown>).messages as DeepSeekApiMessage[];
  }

  const messages: ChatMessage[] = [];

  for (const apiMsg of apiMessages ?? []) {
    const rawRole = (apiMsg.role ?? '').toUpperCase();
    let role: 'user' | 'assistant';
    if (rawRole === 'USER') {
      role = 'user';
    } else if (rawRole === 'ASSISTANT') {
      role = 'assistant';
    } else {
      continue;
    }

    const text = (apiMsg.content ?? '').trim();
    if (!text) continue;

    const timestamp = apiMsg.inserted_at
      ? new Date(apiMsg.inserted_at).getTime()
      : Date.now();

    messages.push({
      id: String(apiMsg.message_id ?? crypto.randomUUID()),
      role,
      text,
      timestamp,
      chatId: conversationId,
    });
  }

  return {
    id: conversationId,
    provider: 'deepseek',
    title: session?.title?.trim() || document.title || 'DeepSeek Conversation',
    messages,
    capturedAt: Date.now(),
    embedding: null,
  };
}

// ─── DOM extraction helpers ─────────────────────────────────────────────────

function extractDeepSeekDomMessages(conversationId: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const seenIds = new Set<string>();

  // DeepSeek uses markdown containers within conversation
  // User messages and assistant messages alternate in the DOM
  const messageContainers = document.querySelectorAll(
    '[class*="ds-markdown"], ' +
    '[class*="fbb737a4"], [class*="f9bf7997"], ' +
    '.chat-message-content, ' +
    '[data-message-author-role]'
  );

  if (messageContainers.length > 0) {
    messageContainers.forEach((container, index) => {
      const el = container as HTMLElement;
      const text = el.innerText?.trim();
      if (!text) return;

      const id = `deepseek_dom_${index}`;
      if (seenIds.has(id)) return;
      seenIds.add(id);

      // Try data-message-author-role first
      const dataRole = el.getAttribute('data-message-author-role');
      let role: 'user' | 'assistant';

      if (dataRole) {
        role = dataRole === 'user' ? 'user' : 'assistant';
      } else {
        // DeepSeek renders user/assistant in alternating containers
        // Check for parent or sibling cues
        const parentClasses = el.parentElement?.className ?? '';
        const closestRole = el.closest('[class*="user"], [class*="User"]');
        role = closestRole || parentClasses.includes('user') ? 'user' : 'assistant';
      }

      messages.push({ id, role, text, timestamp: Date.now(), chatId: conversationId });
    });
    return messages;
  }

  // Broadest fallback: all conversation turn blocks
  const turns = document.querySelectorAll('main .group, main [class*="message"]');
  turns.forEach((turn, index) => {
    const el = turn as HTMLElement;
    const text = el.innerText?.trim();
    if (!text) return;

    const id = `deepseek_dom_fb_${index}`;
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

// ─── Adapter ────────────────────────────────────────────────────────────────

export class DeepSeekAdapter implements ProviderAdapter {
  provider = 'deepseek';

  detect(): boolean {
    return window.location.hostname === 'chat.deepseek.com';
  }

  getConversationId(): string | null {
    // URL pattern: /a/chat/s/{id} or /chat/{id} or /a/chat/{id}
    const match = window.location.pathname.match(
      /\/(?:a\/)?chat(?:\/s)?\/([a-zA-Z0-9_-]+)/
    );
    return match ? match[1] : null;
  }

  async fetchFullConversation(id: string): Promise<NormalizedConversation> {
    console.log(`[Provider] DeepSeekAdapter requesting API capture for ${id}`);

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
              const conversation = parseDeepSeekApiResponse(id, response.data);
              console.log(`[API] Parsed ${conversation.messages.length} messages from DeepSeek API`);
              if (conversation.messages.length === 0) {
                reject(new Error('DeepSeek API returned no user/assistant messages'));
                return;
              }
              resolve(conversation);
            } catch (parseError) {
              console.error('[API] Failed to parse DeepSeek API response');
              reject(parseError instanceof Error ? parseError : new Error(String(parseError)));
            }
          } else {
            console.error('[API] DeepSeek API fetch failed:', response?.error);
            reject(new Error(response?.error || 'Unknown API error'));
          }
        }
      );
    });
  }

  async extractFromDom(): Promise<NormalizedConversation> {
    console.log('[Fallback] DeepSeekAdapter initiating DOM fallback');

    const scrollContainer =
      document.querySelector('[class*="overflow-y-auto"]') ??
      document.querySelector('main') ??
      document.documentElement;

    await scrollToTopToLoadHistory(scrollContainer);

    const conversationId = this.getConversationId() ?? `deepseek_temp_${crypto.randomUUID()}`;
    const messages = extractDeepSeekDomMessages(conversationId);

    return {
      id: conversationId,
      provider: this.provider,
      title: document.title || 'DeepSeek Conversation',
      messages,
      capturedAt: Date.now(),
      embedding: null,
    };
  }
}
