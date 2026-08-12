import { SiteAdapter } from '../injection/adpaterInterface';
import { ChatGPTAdapter } from '../injection/chatgpt';
import { ClaudeAdapter } from '../injection/claude';
import { GeminiAdapter } from '../injection/gemini';
import { DeepSeekAdapter } from '../injection/deepseek';
import { GrokAdapter } from '../injection/grok';
import { GenericAdapter } from '../injection/generic';

const adapters: Record<string, SiteAdapter> = {
  'chatgpt.com': ChatGPTAdapter,
  'chat.openai.com': ChatGPTAdapter,
  'claude.ai': ClaudeAdapter,
  'gemini.google.com': GeminiAdapter,
  'chat.deepseek.com': DeepSeekAdapter,
  'grok.com': GrokAdapter,
  'grok.x.ai': GrokAdapter,
  
  // Generic mappings
  'www.perplexity.ai': GenericAdapter,
  'copilot.microsoft.com': GenericAdapter,
  'poe.com': GenericAdapter,
  'huggingface.co': GenericAdapter,
  'chat.mistral.ai': GenericAdapter,
  'www.meta.ai': GenericAdapter,
  'v0.dev': GenericAdapter,
  'lovable.dev': GenericAdapter,
  'lovable.ai': GenericAdapter,
  'emergent.ai': GenericAdapter,
};

function getAdapterForCurrentSite(): SiteAdapter | null {
  const hostname = window.location.hostname;
  
  // Direct match
  if (adapters[hostname]) {
    return adapters[hostname];
  }
  
  // Partial match for subdomains or similar
  for (const [key, adapter] of Object.entries(adapters)) {
    if (hostname.includes(key)) {
      return adapter;
    }
  }
  
  return null;
}

import { getConversationInfo } from './capture';

function createPokeballIcon(adapter: SiteAdapter): HTMLElement {
  const btn = document.createElement('button');
  btn.id = 'pokeball-context-btn';
  btn.title = 'Capture Context';
  btn.style.background = 'transparent';
  btn.style.border = 'none';
  btn.style.cursor = 'grab'; // Indicates it's draggable
  btn.style.padding = '4px';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.alignSelf = 'center'; // Keep centered vertically in flex containers
  btn.style.zIndex = '999999'; // Ensure it's not hidden
  btn.style.justifyContent = 'center';
  btn.style.transition = 'opacity 0.2s, transform 0.2s';
  btn.style.opacity = '1'; // 50% transparent base
  btn.style.transform = 'scale(1)';
  
  // Hover effects: 100% opaque and slightly larger
  btn.onmouseover = () => {
    btn.style.opacity = '1';
    btn.style.transform = 'scale(1.1)';
  };
  btn.onmouseout = () => {
    btn.style.opacity = '1';
    btn.style.transform = 'scale(1)';
  };

  const img = document.createElement('img');
  // Use Chrome extension API to get the correct URL for the icon
  img.src = chrome.runtime.getURL('icons/pokeball.png');
  img.style.width = '24px';
  img.style.height = '24px';
  img.alt = 'Poké Context Memory';
  // Prevent default image drag to allow button drag
  img.draggable = false; 

  btn.appendChild(img);

  // Make the button draggable
  btn.draggable = true;

  btn.addEventListener('dragstart', (e) => {
    btn.style.opacity = '0.3'; // Visual feedback while dragging
    btn.style.cursor = 'grabbing';
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'copy';
      // Dummy data just to make the drag work cross-platform
      e.dataTransfer.setData('text/plain', 'pokeball'); 
    }
  });

  // When released ("thrown"), capture the context
  btn.addEventListener('dragend', (e) => {
    btn.style.opacity = '0.5';
    btn.style.cursor = 'grab';
    
    // Attempt context capture
    captureContext(adapter);
  });

  // Clicking it also captures context for accessibility
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    captureContext(adapter);
  });

  return btn;
}

function captureContext(adapter: SiteAdapter) {
  console.log('[Context Memory Transfer] Pokeball thrown! Capturing context...');
  
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    console.error('[Context Memory Transfer] Extension context invalidated. Please refresh the page.');
    adapter.setInputText('Error: Extension reloaded. Please refresh the page.');
    return;
  }

  // Set input to show we are processing
  adapter.setInputText('Poké Ball Capturing the Context...');

  const info = getConversationInfo();
  
  chrome.runtime.sendMessage({
    type: 'SUMMARIZE_CONVERSATION',
    payload: { nativeChatId: info.nativeId }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Context Memory Transfer] Error:', chrome.runtime.lastError.message);
      adapter.setInputText('Error capturing context.');
      return;
    }

    if (response && response.error) {
      console.error('[Context Memory Transfer] Capture failed:', response.error);
      adapter.setInputText('Error: ' + response.error);
    } else if (response && response.summary) {
      // Inject the summary into the chat input
      adapter.setInputText(response.summary);
    } else {
      adapter.setInputText('');
    }
  });
}

function tryInjectIcon(adapter: SiteAdapter) {
  // If we already injected it, do nothing
  if (document.getElementById('pokeball-context-btn')) {
    return;
  }

  // Use adapter if it has getIconContainer, otherwise fallback to finding the input element's parent
  let container = adapter.getIconContainer ? adapter.getIconContainer() : null;

  if (!container && !adapter.insertIcon) {
    const input = adapter.getInputElement();
    if (input && input.parentElement) {
      container = input.parentElement;
    }
  }

  if (container || adapter.insertIcon) {
    // Add our icon
    const icon = createPokeballIcon(adapter);
    
    if (adapter.insertIcon) {
      // Allow the adapter to dictate exactly where the icon goes (e.g. insertBefore a specific button)
      adapter.insertIcon(icon);
      console.log('[Context Memory Transfer] Custom injected Pokeball into', window.location.hostname);
    } else if (container) {
      // Fallback: To ensure it stays inline nicely, we use prepend
      container.prepend(icon);
      console.log('[Context Memory Transfer] Prepend injected Pokeball into', window.location.hostname);
    }
  }
}

function initInjection() {
  const adapter = getAdapterForCurrentSite();
  if (!adapter) {
    console.log('[Context Memory Transfer] No adapter found for', window.location.hostname);
    return;
  }

  // Initial attempt
  setTimeout(() => tryInjectIcon(adapter), 1000);

  // Set up an observer in case the UI dynamically loads or changes (like navigating chats)
  const observer = new MutationObserver(() => {
    // Check if the extension context is still valid. If not, disconnect to prevent errors.
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      console.log('[Context Memory Transfer] Extension context invalidated. Disconnecting observer.');
      observer.disconnect();
      return;
    }

    if (!document.getElementById('pokeball-context-btn')) {
      tryInjectIcon(adapter);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInjection);
} else {
  initInjection();
}