import { db } from '../../storage/db';

async function loadMessages() {
  const listElement = document.getElementById('message-list');
  if (!listElement) return;

  try {
    // Get the last 20 messages, ordered by timestamp descending
    const messages = await db.rawMessages.orderBy('timestamp').reverse().limit(20).toArray();
    
    listElement.innerHTML = '';
    
    if (messages.length === 0) {
      listElement.innerHTML = '<li><em>No messages captured yet.</em></li>';
      return;
    }

    messages.forEach((msg) => {
      const li = document.createElement('li');
      li.className = `message-item ${msg.role}`;
      
      const roleBadge = document.createElement('span');
      roleBadge.className = 'role-badge';
      roleBadge.textContent = msg.role;
      
      const textPreview = document.createElement('div');
      textPreview.className = 'text-preview';
      // Basic text preview (truncate if too long)
      textPreview.textContent = msg.text.length > 100 ? msg.text.substring(0, 100) + '...' : msg.text;
      
      li.appendChild(roleBadge);
      li.appendChild(textPreview);
      listElement.appendChild(li);
    });
  } catch (error) {
    console.error('Failed to load messages from Dexie:', error);
    listElement.innerHTML = '<li class="error">Error loading messages</li>';
  }
}

async function clearHistory() {
  try {
    await db.rawMessages.clear();
    await loadMessages();
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadMessages();
  
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearHistory);
  }
});
