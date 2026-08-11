import { ChatMessage, ConversationMetadata, Conversation } from '../shared/types';
import { db } from '../storage/db';
import { summarize } from '../extraction/summarizer';

function formatChronologicalPairs(messages: ChatMessage[]): string[] {
    const pairs: string[] = [];
    for (let i = 0; i < messages.length; i += 2) {
        const userMsg = messages[i];
        const botMsg = messages[i + 1];
        if (botMsg) {
            pairs.push(`User: ${userMsg.text}\nAssistant: ${botMsg.text}`);
        } else {
            pairs.push(`User: ${userMsg.text}`);
        }
    }
    return pairs;
}

function generateShortId(length: number = 8): string {
    return Math.random().toString(36).substring(2, 2 + length);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'NEW_CHAT_MESSAGE') {
    (async () => {
      try {
        const { message: payloadMsg, conversation: meta } = message.payload as { message: ChatMessage, conversation: ConversationMetadata };
        
        console.log(`[ContextDex] Conversation detected: ${meta.platform}`);
        console.log(`[ContextDex] Native ID: ${meta.nativeId}`);
        console.log(`[ContextDex] Title: ${meta.title}`);

        // Check if conversation exists
        let conversation = await db.conversations.where('nativeChatId').equals(meta.nativeId).first();
        
        if (conversation) {
            console.log(`[ContextDex] Existing conversation reused`);
            console.log(`[ContextDex] Internal ID: ${conversation.id}`);
            // Update timestamp
            await db.conversations.update(conversation.id, { updatedAt: Date.now(), title: meta.title });
        } else {
            console.log(`[ContextDex] New conversation created`);
            const newId = `${meta.platform}_${generateShortId()}`;
            conversation = {
                id: newId,
                nativeChatId: meta.nativeId,
                platform: meta.platform,
                title: meta.title,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            await db.conversations.add(conversation);
            console.log(`[ContextDex] Internal ID: ${conversation.id}`);
        }

        // Attach foreign key to message
        payloadMsg.chatId = conversation.id;

        await db.rawMessages.put(payloadMsg);
        
        // Count for logs
        const msgCount = await db.rawMessages.where('chatId').equals(conversation.id).count();
        console.log(`[ContextDex] Extracted messages: 1`); // Content script extracted 1 in this event
        console.log(`[ContextDex] Saved messages for ${conversation.id}. Total in DB for this chat: ${msgCount}`);

        sendResponse({ success: true });
      } catch (err) {
        console.error('[ContextDex] IndexedDB/Dexie error:', err);
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true; // Keep message channel open for async response
  }
  if (message.type === 'GET_CHAT_MESSAGES') {
      const { nativeChatId } = message.payload;
      (async () => {
          try {
              const conversation = await db.conversations.where('nativeChatId').equals(nativeChatId).first();
              if (!conversation) {
                  sendResponse({ messages: [] });
                  return;
              }
              const messages = await db.rawMessages.where('chatId').equals(conversation.id).sortBy('timestamp');
              sendResponse({ messages });
          } catch (e) {
              sendResponse({ error: String(e) });
          }
      })();
      return true;
  }

  if (message.type === 'SUMMARIZE_CONVERSATION') {
      const { nativeChatId } = message.payload || {};
      (async () => {
          try {
              if (!nativeChatId) {
                  sendResponse({ error: "No active conversation specified" });
                  return;
              }

              const conversation = await db.conversations.where('nativeChatId').equals(nativeChatId).first();
              if (!conversation) {
                  sendResponse({ error: "Conversation not found in database" });
                  return;
              }

              // Fetch messages specifically for this chat
              const messages = await db.rawMessages.where('chatId').equals(conversation.id).sortBy('timestamp');
              if (messages.length === 0) {
                  sendResponse({ error: "No messages to summarize in this chat" });
                  return;
              }
              
              console.log(`[Summarizer] Extracting chronological conversation pairs from Dexie for chat ${conversation.id}...`);
              const pairs = formatChronologicalPairs(messages);
              console.log(`[Summarizer] Extracted ${pairs.length} conversation pairs.`);
              
              const transcript = pairs.join('\n\n');
              
              const result = await summarize(transcript, (progressMsg) => {
                  // Forward progress to popup
                  chrome.runtime.sendMessage({
                      type: 'ML_PROGRESS',
                      progress: progressMsg
                  }).catch(() => {}); // Catch if popup is closed
              });

              sendResponse({ summary: result });
              
          } catch (e: any) {
              console.error('[Summarizer] Failed:', e);
              sendResponse({ error: String(e.message || e) });
          }
      })();
      return true; // Keep message channel open for async response
  }

  return false;
});

console.log('[Context Memory Transfer] Background service worker loaded.');
