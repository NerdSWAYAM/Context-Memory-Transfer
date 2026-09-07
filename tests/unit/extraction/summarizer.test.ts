import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { summarize } from '../../../src/extraction/summarizer';

describe('Summarizer', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
        vi.stubEnv('OPENROUTER_API_KEY', 'test_key');
        vi.stubEnv('OPENROUTER_URL', 'https://test-openrouter.com/api/v1');

        originalFetch = global.fetch;
        global.fetch = vi.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('should successfully summarize a transcript', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({
                choices: [
                    { message: { content: 'This is a mocked summary.' } }
                ]
            })
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const onProgress = vi.fn();
        const summary = await summarize('Some test transcript', onProgress);

        expect(summary).toBe('This is a mocked summary.');
        expect(onProgress).toHaveBeenCalledWith('Sending transcript to OpenRouter for summarization...');
        expect(onProgress).toHaveBeenCalledWith('Summarization complete!');
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if API request fails', async () => {
        const mockResponse = {
            ok: false,
            json: async () => ({
                error: { message: 'Invalid API Key' }
            })
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        await expect(summarize('test')).rejects.toThrow('Invalid API Key');
    });


});
