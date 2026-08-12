import { ChatMessage, ConversationMetadata } from '../shared/types';

// Map of messageId -> lastCapturedText to avoid unnecessary duplicate updates
const capturedTextMap = new Map<string, string>();

function extractMessage(node: Element): ChatMessage | null {
  const role = node.getAttribute('data-message-author-role');
  if (!role) return null;

  // ChatGPT places assistant text in a .markdown element, user text in main container
  let text = '';
  const markdownNode = node.querySelector('.markdown');
  if (markdownNode) {
    text = (markdownNode as HTMLElement).innerText;
  } else {
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

let cachedTempId = '';

export function getConversationInfo(): ConversationMetadata {
  let nativeId = '';
  let platform = '';
  const url = window.location.href;

  if (url.includes('chatgpt.com')) {
    platform = 'chatgpt';
    const match = url.match(/\/c\/([a-zA-Z0-9-]+)/);
    if (match) nativeId = match[1];
  }

  // Fallback if no native ID (e.g., unsaved chat)
  if (!nativeId) {
    if (!cachedTempId) {
      cachedTempId = 'temp_' + Math.random().toString(36).substring(2, 11);
    }
    nativeId = cachedTempId;
  }

  let title = document.title || 'New Chat';
  // ChatGPT titles often end with ' - ChatGPT'. Let's clean it up slightly if desired, 
  // but keeping it simple for now.

  return { nativeId, platform, title };
}

function sendToBackground(msg: ChatMessage) {
  try {
    // Check if extension context is valid
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      const conversation = getConversationInfo();
      chrome.runtime.sendMessage(
        {
          type: 'NEW_CHAT_MESSAGE',
          payload: {
            message: msg,
            conversation: conversation
          },
        },
        (_response) => {
          // Accessing runtime.lastError handles and clears the error state
          const err = chrome.runtime.lastError;
          if (err) {
            console.debug('[Context Memory Transfer] Background connection notice:', err.message);
          }
        }
      );
    }
  } catch (error) {
    console.warn('[Context Memory Transfer] Extension context disconnected or reloaded:', error);
  }
}

let observer: MutationObserver | null = null;

function isContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

function processNode(node: Element) {
  if (!isContextValid()) {
    observer?.disconnect();
    return;
  }
  
  const msg = extractMessage(node);
  if (!msg) return;

  const lastText = capturedTextMap.get(msg.id);
  if (lastText !== msg.text) {
    capturedTextMap.set(msg.id, msg.text);
    sendToBackground(msg);
  }
}

function scanDOM() {
  if (!isContextValid()) {
    observer?.disconnect();
    return;
  }
  const messageNodes = document.querySelectorAll('[data-message-author-role]');
  messageNodes.forEach((node) => processNode(node));
}

function processMutations(mutations: MutationRecord[]) {
  if (!isContextValid()) {
    observer?.disconnect();
    return;
  }
  
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.hasAttribute('data-message-author-role')) {
            processNode(element);
          }
          const childMessages = element.querySelectorAll('[data-message-author-role]');
          childMessages.forEach((child) => processNode(child));
        }
      });
    } else if (mutation.type === 'characterData' || mutation.type === 'subtree') {
      let target: Element | null = null;
      if (mutation.target.nodeType === Node.ELEMENT_NODE) {
        target = (mutation.target as Element).closest('[data-message-author-role]');
      } else if (mutation.target.parentElement) {
        target = mutation.target.parentElement.closest('[data-message-author-role]');
      }
      if (target) {
        processNode(target);
      }
    }
  }
}

function init() {
  console.log('[Context Memory Transfer] Content script initialized.');
  
  scanDOM();

  observer = new MutationObserver(processMutations);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener('scroll', scanDOM, { passive: true });
  window.addEventListener('focus', scanDOM);
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Listen for requests from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_CONVERSATION_INFO') {
    sendResponse(getConversationInfo());
    return false;
  }
});


