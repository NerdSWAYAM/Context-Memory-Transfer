
import { ChatMessage } from '../shared/types';

// Set of processed elements to avoid duplicate extractions
const processedNodes = new WeakSet<Element>();

function extractMessage(node: Element): ChatMessage | null {
  const role = node.getAttribute('data-message-author-role');
  if (!role) return null;

  // ChatGPT usually places assistant text in a .markdown element
  // User text is usually just plain text within the node
  let text = '';
  const markdownNode = node.querySelector('.markdown');
  if (markdownNode) {
    text = (markdownNode as HTMLElement).innerText;
  } else {
    // Fallback to the node's text
    text = (node as HTMLElement).innerText || node.textContent || '';
  }

  text = text.trim();
  if (!text) return null;

  const messageId = node.getAttribute('data-message-id') || crypto.randomUUID();

  return {
    id: messageId,
    role: role,
    text: text,
    timestamp: Date.now(),
  };
}

function sendToBackground(msg: ChatMessage) {
  chrome.runtime.sendMessage({
    type: 'NEW_CHAT_MESSAGE',
    payload: msg
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[Context Memory Transfer] Error sending message to background:', chrome.runtime.lastError);
    }
  });
}

function processMutations(mutations: MutationRecord[]) {
  const newMessages: ChatMessage[] = [];

  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // Check if the added node itself is a message node
          if (element.hasAttribute('data-message-author-role') && !processedNodes.has(element)) {
            processedNodes.add(element);
            const msg = extractMessage(element);
            if (msg) newMessages.push(msg);
          }

          // Check if the added node contains message nodes (e.g. initial load of a container)
          const messageNodes = element.querySelectorAll('[data-message-author-role]');
          messageNodes.forEach((msgNode) => {
            if (!processedNodes.has(msgNode)) {
              processedNodes.add(msgNode);
              const msg = extractMessage(msgNode);
              if (msg) newMessages.push(msg);
            }
          });
        }
      });
    } else if (mutation.type === 'attributes') {
        // sometimes the message text is streamed or updated, we could track changes here
        // for Phase 1, we just capture the initially finalized node or assume we capture stream chunks if needed.
        // Actually, ChatGPT creates the node and streams into it. We might want to observe characterData or childList inside it.
        // But for a simple Phase 1, the addedNodes is a good start.
    }
  }

  if (newMessages.length > 0) {
    console.log('[Context Memory Transfer] Captured new messages:', newMessages);
    newMessages.forEach(sendToBackground);
  }
}

// Initial capture for already present messages
function captureInitialMessages() {
  const messageNodes = document.querySelectorAll('[data-message-author-role]');
  const initialMessages: ChatMessage[] = [];
  
  messageNodes.forEach((node) => {
    if (!processedNodes.has(node)) {
      processedNodes.add(node);
      const msg = extractMessage(node);
      if (msg) initialMessages.push(msg);
    }
  });

  if (initialMessages.length > 0) {
    console.log('[Context Memory Transfer] Captured initial messages:', initialMessages);
    initialMessages.forEach(sendToBackground);
  }
}

function init() {
  console.log('[Context Memory Transfer] Content script initialized.');
  
  captureInitialMessages();

  const observer = new MutationObserver(processMutations);
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
