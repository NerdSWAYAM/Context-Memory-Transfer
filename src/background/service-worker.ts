import { ChatMessage, NormalizedConversation } from '../shared/types';
import { ApiCaptureRequest } from '../shared/messages';
import { db } from '../storage/db';
import { summarize } from '../extraction/summarizer';
import { formatChronologicalPairs } from '../shared/transcript';

function generateShortId(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

async function fetchConversationFromApi(request: ApiCaptureRequest): Promise<unknown> {
  const { provider, id, apiBase } = request;

  if (provider !== 'chatgpt') {
    throw new Error('Unsupported provider for API capture');
  }

  const url = `${apiBase.replace(/\/$/, '')}/backend-api/conversation/${id}`;
  console.log(`[API] Fetching conversation from provider=${provider} id=${id}`);

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`[API] Request failed with status ${response.status}`);
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  console.log('[API] Conversation payload received');
  return data;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'REQUEST_API_CAPTURE') {
    (async () => {
      try {
        const data = await fetchConversationFromApi(message.payload as ApiCaptureRequest);
        sendResponse({ success: true, data });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[API] Capture error:', errorMessage);
        sendResponse({ success: false, error: errorMessage });
      }
    })();
    return true;
  }

  if (message.type === 'SAVE_CONVERSATION') {
    (async () => {
      try {
        const { conversation } = message.payload as { conversation: NormalizedConversation };
        console.log(`[Storage] Saving conversation ${conversation.id} (${conversation.messages.length} messages)`);

        let dbConv = await db.conversations
          .where('nativeChatId')
          .equals(conversation.id)
          .first();
        let dbId: string;

        if (dbConv) {
          dbId = dbConv.id;
          await db.conversations.update(dbId, {
            updatedAt: Date.now(),
            title: conversation.title,
          });
        } else {
          dbId = `${conversation.provider}_${generateShortId()}`;
          await db.conversations.add({
            id: dbId,
            nativeChatId: conversation.id,
            platform: conversation.provider,
            title: conversation.title,
            createdAt: conversation.capturedAt,
            updatedAt: conversation.capturedAt,
          });
        }

        const messagesToSave: ChatMessage[] = conversation.messages.map((msg) => ({
          ...msg,
          chatId: dbId,
        }));

        await db.rawMessages.bulkPut(messagesToSave);
        console.log(`[Storage] Saved ${messagesToSave.length} messages`);
        sendResponse({ success: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Storage] Error saving conversation:', errorMessage);
        sendResponse({ success: false, error: errorMessage });
      }
    })();
    return true;
  }

  if (message.type === 'NEW_CHAT_MESSAGE') {
    (async () => {
      try {
        const { message: payloadMsg, conversation: meta } = message.payload as {
          message: ChatMessage;
          conversation: { nativeId: string; platform: string; title: string };
        };

        let conversation = await db.conversations
          .where('nativeChatId')
          .equals(meta.nativeId)
          .first();

        if (conversation) {
          await db.conversations.update(conversation.id, {
            updatedAt: Date.now(),
            title: meta.title,
          });
        } else {
          const newId = `${meta.platform}_${generateShortId()}`;
          conversation = {
            id: newId,
            nativeChatId: meta.nativeId,
            platform: meta.platform,
            title: meta.title,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await db.conversations.add(conversation);
        }

        payloadMsg.chatId = conversation.id;
        await db.rawMessages.put(payloadMsg);
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'GET_CHAT_MESSAGES') {
    const { nativeChatId } = message.payload;
    (async () => {
      try {
        const conversation = await db.conversations
          .where('nativeChatId')
          .equals(nativeChatId)
          .first();
        if (!conversation) {
          sendResponse({ messages: [] });
          return;
        }
        const messages = await db.rawMessages
          .where('chatId')
          .equals(conversation.id)
          .sortBy('timestamp');
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
          sendResponse({ error: 'No active conversation specified' });
          return;
        }

        const conversation = await db.conversations
          .where('nativeChatId')
          .equals(nativeChatId)
          .first();
        if (!conversation) {
          sendResponse({ error: 'Conversation not found in database' });
          return;
        }

        const messages = await db.rawMessages
          .where('chatId')
          .equals(conversation.id)
          .sortBy('timestamp');

        if (messages.length === 0) {
          sendResponse({ error: 'No messages to summarize in this chat' });
          return;
        }

        const pairs = formatChronologicalPairs(messages);
        const transcript = pairs.join('\n\n');
        const result = await summarize(transcript, (progressMsg) => {
          chrome.runtime.sendMessage({ type: 'ML_PROGRESS', progress: progressMsg }).catch(() => {});
        });
        sendResponse({ summary: result });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        sendResponse({ error: errorMessage });
      }
    })();
    return true;
  }

  return false;
});

console.log('[Context Memory Transfer] Background service worker loaded.');
