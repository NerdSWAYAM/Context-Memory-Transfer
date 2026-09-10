import { describe, it, expect, vi } from 'vitest';
import { summarize } from '../../../src/extraction/summarizer';
import { ChatMessage } from '../../../src/shared/types';

describe('Summarizer', () => {
    it('should successfully summarize a transcript using deterministic engine', async () => {
        const mockMessages: ChatMessage[] = [
            {
                id: '1',
                role: 'user',
                text: 'We must use React for the frontend.',
                timestamp: Date.now()
            },
            {
                id: '2',
                role: 'assistant',
                text: 'Okay, React it is.',
                timestamp: Date.now() + 1000
            }
        ];

        const onProgress = vi.fn();
        const summary = await summarize(mockMessages, onProgress);

        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
        expect(onProgress).toHaveBeenCalledWith('Running deterministic summarization engine...');
        expect(onProgress).toHaveBeenCalledWith('Summarization complete!');
    });

    it('should handle empty messages gracefully', async () => {
        const mockMessages: ChatMessage[] = [];

        const summary = await summarize(mockMessages);
        
        expect(typeof summary).toBe('string');
    });
});
