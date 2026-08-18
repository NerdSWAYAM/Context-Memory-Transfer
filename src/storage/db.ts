import Dexie, { Table } from 'dexie';
import { ChatMessage, Conversation } from '../shared/types';

export class ContextMemoryDB extends Dexie {
  rawMessages!: Table<ChatMessage, string>;
  conversations!: Table<Conversation, string>;

  constructor() {
    super('ContextMemoryDB');
    this.version(1).stores({
      rawMessages: 'id, role, timestamp, chatId'
    });
    this.version(2).stores({
      conversations: 'id, nativeChatId, platform, updatedAt',
      rawMessages: 'id, role, timestamp, chatId'
    });
    this.version(3).stores({
      conversations: 'id, nativeChatId, platform, updatedAt, version',
      rawMessages: 'id, role, timestamp, chatId'
    }).upgrade(tx => {
      // Backfill version=1 for existing conversations
      return tx.table('conversations').toCollection().modify(conv => {
        if (!conv.version) conv.version = 1;
      });
    });
  }
}

export const db = new ContextMemoryDB();