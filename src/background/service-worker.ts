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
  const base = apiBase.replace(/\/$/, '');

  console.log(`[API] Fetching conversation from provider=${provider} id=${id}`);

  let url: string;
  const headers: Record<string, string> = { Accept: 'application/json' };

  switch (provider) {
    case 'chatgpt': {
      url = `${base}/backend-api/conversation/${id}`;
      break;
    }
    case 'claude': {
      // Claude API needs the org UUID. We attempt the known patterns.
      // The most common internal endpoint: /api/organizations/{org}/chat_conversations/{id}
      // We first try to find the org from cookies or page data, falling back to a wildcard pattern.
      url = `${base}/api/organizations/-/chat_conversations/${id}?tree=True&rendering_mode=messages&render_all_tools=true`;
      headers['Content-Type'] = 'application/json';
      break;
    }
    case 'gemini': {
      // Gemini doesn't expose a simple REST API like ChatGPT.
      // We'll try the internal batch endpoint structure. This is experimental.
      throw new Error('Gemini API capture not yet supported — falling back to DOM');
    }
    case 'deepseek': {
      // DeepSeek chat history endpoint
      url = `${base}/api/v0/chat/history_messages?chat_session_id=${id}`;
      break;
    }
    default:
      throw new Error(`Unsupported provider for API capture: ${provider}`);
  }

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers,
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
            version: (dbConv.version || 1) + 1,
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
            version: 1,
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
            version: 1,
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

        // Save summary to conversation in Dexie DB
        await db.conversations.update(conversation.id, {
          summary: result,
          updatedAt: Date.now(),
        });

        // Save summary in chrome.storage.local so it persists across sessions and tabs
        await chrome.storage.local.set({ latest_transfer_summary: result, latest_summary_chat_id: conversation.id });

        sendResponse({ summary: result });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        sendResponse({ error: errorMessage });
      }
    })();
    return true;
  }

  if (message.type === 'GET_ALL_SUMMARIES') {
    (async () => {
      try {
        const conversations = await db.conversations.toArray();
        const withSummary = conversations
          .filter(c => !!c.summary)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map(c => ({
            id: c.id,
            nativeChatId: c.nativeChatId,
            title: c.title || 'Unknown Chat',
            updatedAt: c.updatedAt || Date.now(),
            version: c.version || 1,
            summary: c.summary,
            platform: c.platform,
          }));
        sendResponse({ conversations: withSummary });
      } catch (e) {
        sendResponse({ error: String(e) });
      }
    })();
    return true;
  }

  return false;
});

console.log('[Context Memory Transfer] Background service worker loaded.');
