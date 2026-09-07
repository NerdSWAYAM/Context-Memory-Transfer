import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConversationCaptureOrchestrator } from '../../src/content/conversation-capture';
import * as detector from '../../src/content/detector';
import { ProviderAdapter, NormalizedConversation } from '../../src/shared/types';
import { db } from '../../src/storage/db';

describe('Conversation Capture Orchestrator', () => {
    let orchestrator: ConversationCaptureOrchestrator;
    let mockAdapter: ProviderAdapter;

    beforeEach(() => {
        vi.clearAllMocks();

        // Basic mock adapter
        mockAdapter = {
            provider: 'mock-provider',
            detect: vi.fn().mockReturnValue(true),
            getConversationId: vi.fn().mockReturnValue('mock-id'),
            fetchFullConversation: vi.fn(),
            extractFromDom: vi.fn()
        };

        vi.spyOn(detector, 'detectProvider').mockReturnValue(mockAdapter);

        // Reset document title for tests
        document.title = 'Test Chat';

        orchestrator = new (ConversationCaptureOrchestrator as any)();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should fail if no conversation ID is found', async () => {
        (mockAdapter.getConversationId as any).mockReturnValue(null);

        const result = await orchestrator.triggerManualCapture();
        expect(result.success).toBe(false);
        expect(result.error).toBe('No conversation ID found on this page');
    });

    it('should fall back to DOM extraction if API fails', async () => {
        (mockAdapter.fetchFullConversation as any).mockRejectedValue(new Error('API failed'));
        
        const mockConv: NormalizedConversation = {
            id: 'mock-id',
            provider: 'mock-provider',
            title: 'Title',
            capturedAt: Date.now(),
            messages: [
                { id: '1', role: 'user', text: 'hi', timestamp: 1 }
            ]
        };

        (mockAdapter.extractFromDom as any).mockResolvedValue(mockConv);

        // Mock chrome runtime sendMessage for SAVE_CONVERSATION
        (global.chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
            if (msg.type === 'SAVE_CONVERSATION') {
                if (callback) callback({ success: true });
            }
            return Promise.resolve();
        });

        const result = await orchestrator.triggerManualCapture();
        
        expect(mockAdapter.fetchFullConversation).toHaveBeenCalled();
        expect(mockAdapter.extractFromDom).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.usedFallback).toBe(true);
        expect(result.messageCount).toBe(1);
    });

    it('should deduplicate messages correctly', async () => {
        const mockConv: NormalizedConversation = {
            id: 'mock-id',
            provider: 'mock-provider',
            title: 'Title',
            capturedAt: Date.now(),
            messages: [
                { id: '1', role: 'user', text: 'hi', timestamp: 1 },
                { id: '1', role: 'user', text: 'hi', timestamp: 1 }, // Duplicate by ID
                { id: '2', role: 'user', text: 'hi', timestamp: 2 }, // Duplicate by role + text content
            ]
        };

        (mockAdapter.fetchFullConversation as any).mockResolvedValue(mockConv);

        (global.chrome.runtime.sendMessage as any).mockImplementation((msg: any, callback: any) => {
            if (msg.type === 'SAVE_CONVERSATION') {
                if (callback) callback({ success: true });
            }
            return Promise.resolve();
        });

        const result = await orchestrator.triggerManualCapture();
        
        expect(result.success).toBe(true);
        expect(result.duplicateCount).toBe(2); // Should remove the two duplicates
        expect(result.messageCount).toBe(1);
    });

    it('should fail validation if there are no valid messages', async () => {
        const mockConv: NormalizedConversation = {
            id: 'mock-id',
            provider: 'mock-provider',
            title: 'Title',
            capturedAt: Date.now(),
            messages: []
        };

        (mockAdapter.fetchFullConversation as any).mockResolvedValue(mockConv);

        const result = await orchestrator.triggerManualCapture();
        
        expect(result.success).toBe(false);
        expect(result.error).toBe('Conversation has no messages');
    });
});
