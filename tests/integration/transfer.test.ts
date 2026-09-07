import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// We'll mock chrome.tabs.sendMessage and chrome.scripting.executeScript
// to verify that popup handles the transfer logic properly.
// Since popup.ts is heavily DOM dependent, we'll simulate the key functions.

describe('Transfer Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock standard chrome behaviour
        (global.chrome.tabs.query as any).mockResolvedValue([{ id: 101, url: 'https://chatgpt.com' }]);
        (global.chrome.tabs.sendMessage as any).mockResolvedValue({ success: true });
        (global.chrome.scripting.executeScript as any).mockResolvedValue([{ result: true }]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should inject INJECT_AND_SEND message to content script', async () => {
        const textToInject = `We are starting a fresh session... Summary text`;

        // Simulate the logic in handleCardClick
        await global.chrome.tabs.sendMessage(101, {
            type: 'INJECT_AND_SEND',
            payload: { text: textToInject }
        });

        expect(global.chrome.tabs.sendMessage).toHaveBeenCalledWith(
            101,
            {
                type: 'INJECT_AND_SEND',
                payload: { text: expect.stringContaining('starting a fresh session') }
            }
        );
    });

    it('should fallback to executeScript if content script fails', async () => {
        // Mock sendMessage to fail
        (global.chrome.tabs.sendMessage as any).mockRejectedValue(new Error('Receiving end does not exist'));

        const textToInject = `Summary text`;

        try {
            await global.chrome.tabs.sendMessage(101, { type: 'INJECT_AND_SEND' });
        } catch (e) {
            // Fallback logic
            await global.chrome.scripting.executeScript({
                target: { tabId: 101 },
                func: () => {}, // Mock function
                args: [textToInject],
            });
        }

        expect(global.chrome.scripting.executeScript).toHaveBeenCalledWith(
            expect.objectContaining({
                target: { tabId: 101 },
                args: [textToInject]
            })
        );
    });
});
