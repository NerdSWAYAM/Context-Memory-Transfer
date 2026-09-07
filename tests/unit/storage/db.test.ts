import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../../src/storage/db';

describe('Storage DB', () => {
    beforeEach(async () => {
        // Clear all tables before each test
        await db.conversations.clear();
        await db.rawMessages.clear();
    });

    it('should save and retrieve a conversation', async () => {
        const conversation = {
            id: 'conv1',
            nativeChatId: 'native1',
            platform: 'chatgpt',
            title: 'Test Chat',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1
        };

        await db.conversations.add(conversation);

        const retrieved = await db.conversations.get('conv1');
        expect(retrieved).toMatchObject(conversation);
    });

    it('should save and retrieve messages for a conversation', async () => {
        const messages = [
            { id: 'msg1', role: 'user', text: 'hello', timestamp: 1, chatId: 'conv1' },
            { id: 'msg2', role: 'assistant', text: 'hi', timestamp: 2, chatId: 'conv1' },
        ];

        await db.rawMessages.bulkAdd(messages);

        const retrieved = await db.rawMessages.where('chatId').equals('conv1').sortBy('timestamp');
        expect(retrieved).toHaveLength(2);
        expect(retrieved[0].id).toBe('msg1');
        expect(retrieved[1].id).toBe('msg2');
    });

    it('should query conversations by nativeChatId', async () => {
        await db.conversations.add({
            id: 'conv2',
            nativeChatId: 'native-chat-2',
            platform: 'claude',
            title: 'Claude Chat',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1
        });

        const conv = await db.conversations.where('nativeChatId').equals('native-chat-2').first();
        expect(conv).toBeDefined();
        expect(conv?.id).toBe('conv2');
    });

    it('should update conversation summary', async () => {
        await db.conversations.add({
            id: 'conv3',
            nativeChatId: 'native3',
            platform: 'gemini',
            title: 'Test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: 1
        });

        await db.conversations.update('conv3', { summary: 'A nice summary' });

        const updated = await db.conversations.get('conv3');
        expect(updated?.summary).toBe('A nice summary');
    });
});
