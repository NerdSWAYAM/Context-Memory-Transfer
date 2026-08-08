import { ChatMessage } from '../shared/types';
import { db } from '../storage/db';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_CHAT_MESSAGE') {
    const payload = message.payload as ChatMessage;
    
    // Save directly to Dexie IndexedDB
    // Using put() so it updates if the ID already exists, or creates new
    db.rawMessages.put(payload)
      .then(() => {
        console.log('[Context Memory Transfer - Background] Stored message in Dexie:', payload.id);
      })
      .catch((err) => {
        console.error('[Context Memory Transfer - Background] Dexie save error:', err);
      });
      
    // Acknowledge receipt immediately
    sendResponse({ success: true });
  }
  
  return false; 
});

console.log('[Context Memory Transfer] Background service worker loaded with Dexie.');
