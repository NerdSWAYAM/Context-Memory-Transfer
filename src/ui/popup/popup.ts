import { ChatMessage, ConversationMetadata } from '../../shared/types';

let currentNativeChatId: string | null = null;

async function loadMessages() {
  const listElement = document.getElementById('message-list');
  const titleElement = document.getElementById('active-chat-title');
  if (!listElement) return;

  try {
    // 1. Get the active tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!activeTab || !activeTab.id) {
        listElement.innerHTML = '<li><em>No active tab found.</em></li>';
        if (titleElement) titleElement.textContent = 'Unknown Context';
        return;
    }

    // 2. Ask the content script on the active tab for the conversation info
    let meta: ConversationMetadata | null = null;
    try {
        meta = await chrome.tabs.sendMessage(activeTab.id, { type: 'GET_CONVERSATION_INFO' });
    } catch (e) {
        // Content script might not be injected (e.g. non-supported page like chrome://)
        listElement.innerHTML = '<li><em>No supported chat detected on this page.</em></li>';
        if (titleElement) titleElement.textContent = 'Inactive / Not a chat page';
        return;
    }

    if (!meta || !meta.nativeId) {
        listElement.innerHTML = '<li><em>Could not detect conversation.</em></li>';
        if (titleElement) titleElement.textContent = 'Unknown Chat';
        return;
    }

    currentNativeChatId = meta.nativeId;
    if (titleElement) {
        titleElement.textContent = meta.title.length > 50 ? meta.title.substring(0, 50) + '...' : meta.title;
    }

    // 3. Ask background script for messages of this specific chat
    const response = await chrome.runtime.sendMessage({ 
        type: 'GET_CHAT_MESSAGES', 
        payload: { nativeChatId: currentNativeChatId } 
    });

    const messages: ChatMessage[] = response.messages || [];

    listElement.innerHTML = '';

    if (messages.length === 0) {
      listElement.innerHTML = '<li><em>No messages captured in this chat yet.</em></li>';
      return;
    }

    // Sort descending for display (newest at bottom, but if we want newest at top we reverse)
    // The previous code had `.reverse().limit(20)`. Let's just show all or last 50 for this chat.
    messages.reverse().slice(0, 50).forEach((msg) => {
      const li = document.createElement('li');
      li.className = `message-item ${msg.role}`;

      const roleBadge = document.createElement('span');
      roleBadge.className = 'role-badge';
      roleBadge.textContent = msg.role;

      const textPreview = document.createElement('div');
      textPreview.className = 'text-preview';
      textPreview.textContent =
        msg.text.length > 100 ? msg.text.substring(0, 100) + '...' : msg.text;

      li.appendChild(roleBadge);
      li.appendChild(textPreview);
      listElement.appendChild(li);
    });
  } catch (error) {
    console.error('Failed to load messages:', error);
    listElement.innerHTML = '<li class="error">Error loading messages</li>';
  }
}

function setupListeners() {
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      await db.rawMessages.clear();
      loadMessages();
    });
  }

  const captureBtn = document.getElementById('capture-btn');
  if (captureBtn) {
    captureBtn.addEventListener('click', () => {
      alert(
        'Capture logic running via content scripts implicitly as you browse ChatGPT!'
      );
    });
  }

  const summariseBtn = document.getElementById('summarise-btn');
  const summaryContainer = document.getElementById('summary-container');

  if (summariseBtn && summaryContainer) {
    summariseBtn.addEventListener('click', async () => {
      summaryContainer.style.display = 'block';
      summaryContainer.textContent = 'Preparing conversation…';
      summariseBtn.setAttribute('disabled', 'true');

      try {
        const response = await chrome.runtime.sendMessage({ 
            type: 'SUMMARIZE_CONVERSATION',
            payload: { nativeChatId: currentNativeChatId }
        });
        
        if (response.error) {
            summaryContainer.innerHTML = `<span style="color: red;">Error: ${response.error}</span>`;
        } else if (response.summary) {
            summaryContainer.innerHTML = `<strong>Summary:</strong><br/>${response.summary.replace(/\n/g, '<br/>')}`;
        }
      } catch (error: any) {
        const message = error?.message ? String(error.message) : String(error);
        summaryContainer.innerHTML = `<span style="color: red;">Error: ${message}</span>`;
      } finally {
        summariseBtn.removeAttribute('disabled');
      }
    });

    // Listen for streaming progress from the background/offscreen worker
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'ML_PROGRESS' && summaryContainer && summariseBtn.hasAttribute('disabled')) {
            summaryContainer.textContent = message.progress;
        }
    });
  }
}

function init() {
  loadMessages();
  setupListeners();
}

document.addEventListener('DOMContentLoaded', init);
