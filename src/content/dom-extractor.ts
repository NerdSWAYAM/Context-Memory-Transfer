import { ChatMessage } from '../shared/types';

export function extractMessageFromNode(
  node: Element,
  conversationId?: string
): ChatMessage | null {
  const role = node.getAttribute('data-message-author-role');
  if (!role) return null;

  let text = '';
  const markdownNode = node.querySelector('.markdown');
  if (markdownNode) {
    text = (markdownNode as HTMLElement).innerText;
  } else {
    text = (node as HTMLElement).innerText || node.textContent || '';
  }

  text = text.trim();
  if (!text) return null;

  const roleNormalized = role.toLowerCase();
  if (roleNormalized !== 'user' && roleNormalized !== 'assistant') {
    return null;
  }

  const messageId = node.getAttribute('data-message-id') || crypto.randomUUID();

  return {
    id: messageId,
    role: roleNormalized,
    text,
    timestamp: Date.now(),
    chatId: conversationId,
  };
}

export function scanFullDom(conversationId?: string): ChatMessage[] {
  console.log('[Extract] Scanning full DOM for messages');
  const messageNodes = document.querySelectorAll('[data-message-author-role]');
  const messages: ChatMessage[] = [];
  const seenIds = new Set<string>();

  messageNodes.forEach((node) => {
    const msg = extractMessageFromNode(node, conversationId);
    if (msg && !seenIds.has(msg.id)) {
      seenIds.add(msg.id);
      messages.push(msg);
    }
  });

  console.log(`[Extract] Found ${messages.length} messages in DOM`);
  return messages;
}
