import Dexie, { Table } from 'dexie';
import { ChatMessage } from '../shared/types';

export class ContextMemoryDB extends Dexie {
  rawMessages!: Table<ChatMessage, string>;

  constructor() {
    super('ContextMemoryDB');
    this.version(1).stores({
      // Primary key is 'id'
      // Indices on role, timestamp, and chatId for fast querying
      rawMessages: 'id, role, timestamp, chatId'
    });
  }
}

export const db = new ContextMemoryDB();