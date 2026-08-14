import { ProviderAdapter, NormalizedConversation, ChatMessage } from '../../shared/types';
import { ApiCaptureResponse } from '../../shared/messages';
import { scanFullDom } from '../dom-extractor';
import { scrollToTopToLoadHistory } from '../scroll-engine';

/** Provider-internal API shapes — never exported outside this adapter. */
interface ChatGptApiConversation {
  title?: string;
  create_time?: number;
  update_time?: number;
  current_node?: string;
  mapping?: Record<string, ChatGptMappingNode>;
}

interface ChatGptMappingNode {
  id?: string;
  parent?: string | null;
  children?: string[];
  message?: ChatGptApiMessage | null;
}

interface ChatGptApiMessage {
  id?: string;
  author?: { role?: string };
  create_time?: number;
  content?: {
    content_type?: string;
    parts?: unknown[];
    text?: string;
  };
}

function extractTextFromParts(parts: unknown[] | undefined): string {
  if (!parts?.length) return '';

  return parts
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object') {
        const record = part as Record<string, unknown>;
        if (typeof record.text === 'string') return record.text;
        if (typeof record.content === 'string') return record.content;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function extractMessageText(message: ChatGptApiMessage): string {
  const content = message.content;
  if (!content) return '';

  if (content.content_type === 'text' || content.content_type === 'multimodal_text') {
    return extractTextFromParts(content.parts);
  }

  if (typeof content.text === 'string') {
    return content.text.trim();
  }

  return extractTextFromParts(content.parts);
}

function resolveCanonicalPath(
  mapping: Record<string, ChatGptMappingNode>,
  currentNode?: string
): ChatGptApiMessage[] {
  if (!Object.keys(mapping).length) return [];

  if (currentNode && mapping[currentNode]) {
    const path: ChatGptApiMessage[] = [];
    let nodeId: string | null | undefined = currentNode;

    while (nodeId && mapping[nodeId]) {
      const current: ChatGptMappingNode = mapping[nodeId];
      if (current.message?.content) {
        path.push(current.message);
      }
      nodeId = current.parent ?? null;
    }

    return path.reverse();
  }

  // Fallback: walk from first root following the largest child subtree.
  const roots = Object.entries(mapping)
    .filter(([, node]) => !node.parent || !mapping[node.parent])
    .map(([id]) => id);

  if (!roots.length) return [];

  const messages: ChatGptApiMessage[] = [];

  function subtreeSize(nodeId: string): number {
    const node = mapping[nodeId];
    if (!node) return 0;
    let size = node.message?.content ? 1 : 0;
    for (const childId of node.children ?? []) {
      size += subtreeSize(childId);
    }
    return size;
  }

  function walk(nodeId: string): void {
    const node = mapping[nodeId];
    if (!node) return;
    if (node.message?.content) {
      messages.push(node.message);
    }
    const children = node.children ?? [];
    if (!children.length) return;
    const bestChild = children.reduce((best, child) =>
      subtreeSize(child) > subtreeSize(best) ? child : best
    );
    walk(bestChild);
  }

  walk(roots[0]);
  return messages;
}

function parseChatGptApiResponse(
  conversationId: string,
  data: unknown
): NormalizedConversation {
  const raw = data as ChatGptApiConversation;
  const mapping = raw.mapping ?? {};
  const apiMessages = resolveCanonicalPath(mapping, raw.current_node);

  const messages: ChatMessage[] = [];

  for (const apiMessage of apiMessages) {
    const role = apiMessage.author?.role?.toLowerCase();
    if (role !== 'user' && role !== 'assistant') continue;

    const text = extractMessageText(apiMessage);
    if (!text) continue;

    const timestamp =
      typeof apiMessage.create_time === 'number'
        ? Math.round(apiMessage.create_time * 1000)
        : Date.now();

    messages.push({
      id: apiMessage.id ?? crypto.randomUUID(),
      role,
      text,
      timestamp,
      chatId: conversationId,
    });
  }

  return {
    id: conversationId,
    provider: 'chatgpt',
    title: raw.title?.trim() || document.title || 'ChatGPT Conversation',
    messages,
    capturedAt: Date.now(),
    embedding: null,
  };
}

export class ChatGPTAdapter implements ProviderAdapter {
  provider = 'chatgpt';

  detect(): boolean {
    const host = window.location.hostname;
    return host === 'chatgpt.com' || host === 'chat.openai.com';
  }

  getConversationId(): string | null {
    const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  async fetchFullConversation(id: string): Promise<NormalizedConversation> {
    console.log(`[Provider] ChatGPTAdapter requesting API capture for ${id}`);

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
              const conversation = parseChatGptApiResponse(id, response.data);
              console.log(`[API] Parsed ${conversation.messages.length} messages from API response`);
              if (conversation.messages.length === 0) {
                reject(new Error('API returned no user/assistant messages'));
                return;
              }
              resolve(conversation);
            } catch (parseError) {
              console.error('[API] Failed to parse ChatGPT API response');
              reject(parseError instanceof Error ? parseError : new Error(String(parseError)));
            }
          } else {
            console.error('[API] ChatGPT API fetch failed:', response?.error);
            reject(new Error(response?.error || 'Unknown API error'));
          }
        }
      );
    });
  }

  async extractFromDom(): Promise<NormalizedConversation> {
    console.log('[Fallback] ChatGPTAdapter initiating DOM fallback');

    const scrollContainer = findChatGptScrollContainer();
    await scrollToTopToLoadHistory(scrollContainer);

    const conversationId = this.getConversationId() ?? `temp_${crypto.randomUUID()}`;
    const messages = scanFullDom(conversationId);

    return {
      id: conversationId,
      provider: this.provider,
      title: document.title || 'ChatGPT Conversation',
      messages,
      capturedAt: Date.now(),
      embedding: null,
    };
  }
}

function findChatGptScrollContainer(): Element {
  const selectors = [
    'main [class*="overflow-y-auto"]',
    'main',
    '[class*="react-scroll-to-bottom"]',
    'div[class*="overflow-y-auto"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }

  return document.documentElement;
}
