import { ProviderAdapter, NormalizedConversation, ChatMessage } from '../../shared/types';
import { ApiCaptureResponse } from '../../shared/messages';
import { scrollToTopToLoadHistory } from '../scroll-engine';

// ─── Provider-internal types — never exported ───────────────────────────────

interface GeminiApiResponse {
  // Gemini internal conversation structure varies;
  // the key shape we look for after fetching
  conversationId?: string;
  title?: string;
  turns?: GeminiTurn[];
}

interface GeminiTurn {
  id?: string;
  role?: string;      // 'USER' | 'MODEL'
  parts?: GeminiPart[];
  createTime?: string;
}

interface GeminiPart {
  text?: string;
}

// ─── Parsing ────────────────────────────────────────────────────────────────

function parseGeminiApiResponse(
  conversationId: string,
  data: unknown
): NormalizedConversation {
  const raw = data as GeminiApiResponse;
  const turns = raw.turns ?? [];
  const messages: ChatMessage[] = [];

  for (const turn of turns) {
    const rawRole = (turn.role ?? '').toUpperCase();
    let role: 'user' | 'assistant';
    if (rawRole === 'USER') {
      role = 'user';
    } else if (rawRole === 'MODEL') {
      role = 'assistant';
    } else {
      continue;
    }

    const text = (turn.parts ?? [])
      .map((p) => p.text ?? '')
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!text) continue;

    const timestamp = turn.createTime
      ? new Date(turn.createTime).getTime()
      : Date.now();

    messages.push({
      id: turn.id ?? crypto.randomUUID(),
      role,
      text,
      timestamp,
      chatId: conversationId,
    });
  }

  return {
    id: conversationId,
    provider: 'gemini',
    title: raw.title?.trim() || document.title || 'Gemini Conversation',
    messages,
    capturedAt: Date.now(),
    embedding: null,
  };
}

// ─── DOM extraction helpers ─────────────────────────────────────────────────

function extractGeminiDomMessages(conversationId: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const seenIds = new Set<string>();

  // Gemini uses turn containers with query-content / model-response patterns
  const turnContainers = document.querySelectorAll(
    'user-query, model-response, ' +
    '[class*="query-content"], [class*="model-response"], ' +
    '.conversation-container .turn-content, ' +
    'message-content'
  );

  if (turnContainers.length > 0) {
    turnContainers.forEach((container, index) => {
      const el = container as HTMLElement;
      const text = el.innerText?.trim();
      if (!text) return;

      const id = `gemini_dom_${index}`;
      if (seenIds.has(id)) return;
      seenIds.add(id);

      const tagName = el.tagName.toLowerCase();
      const classList = el.className || '';

      let role: 'user' | 'assistant' = 'assistant';
      if (
        tagName === 'user-query' ||
        classList.includes('query-content') ||
        classList.includes('user')
      ) {
        role = 'user';
      }

      messages.push({ id, role, text, timestamp: Date.now(), chatId: conversationId });
    });
    return messages;
  }

  // Broader fallback: look for alternating content blocks within main
  const blocks = document.querySelectorAll(
    'main [class*="turn"], main [class*="response"], main [class*="query"]'
  );

  blocks.forEach((block, index) => {
    const el = block as HTMLElement;
    const text = el.innerText?.trim();
    if (!text) return;

    const id = `gemini_dom_fb_${index}`;
    if (seenIds.has(id)) return;
    seenIds.add(id);

    const classList = el.className || '';
    const role: 'user' | 'assistant' =
      classList.includes('query') || classList.includes('user') ? 'user' : 'assistant';

    messages.push({ id, role, text, timestamp: Date.now(), chatId: conversationId });
  });

  return messages;
}

// ─── Adapter ────────────────────────────────────────────────────────────────

export class GeminiAdapter implements ProviderAdapter {
  provider = 'gemini';

  detect(): boolean {
    return window.location.hostname === 'gemini.google.com';
  }

  getConversationId(): string | null {
    // URL pattern: /app/{id} or /chat/{id}
    const match = window.location.pathname.match(/\/(?:app|chat)\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  async fetchFullConversation(id: string): Promise<NormalizedConversation> {
    console.log(`[Provider] GeminiAdapter requesting API capture for ${id}`);

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
              const conversation = parseGeminiApiResponse(id, response.data);
              console.log(`[API] Parsed ${conversation.messages.length} messages from Gemini API`);
              if (conversation.messages.length === 0) {
                reject(new Error('Gemini API returned no user/assistant messages'));
                return;
              }
              resolve(conversation);
            } catch (parseError) {
              console.error('[API] Failed to parse Gemini API response');
              reject(parseError instanceof Error ? parseError : new Error(String(parseError)));
            }
          } else {
            console.error('[API] Gemini API fetch failed:', response?.error);
            reject(new Error(response?.error || 'Unknown API error'));
          }
        }
      );
    });
  }

  async extractFromDom(): Promise<NormalizedConversation> {
    console.log('[Fallback] GeminiAdapter initiating DOM fallback');

    const scrollContainer =
      document.querySelector('[class*="overflow-y-auto"]') ??
      document.querySelector('main') ??
      document.documentElement;

    await scrollToTopToLoadHistory(scrollContainer);

    const conversationId = this.getConversationId() ?? `gemini_temp_${crypto.randomUUID()}`;
    const messages = extractGeminiDomMessages(conversationId);

    return {
      id: conversationId,
      provider: this.provider,
      title: document.title || 'Gemini Conversation',
      messages,
      capturedAt: Date.now(),
      embedding: null,
    };
  }
}
