import { describe, it, expect } from 'vitest';
import { formatChronologicalPairs, chunkPairs } from '../../../src/shared/transcript';
import { ChatMessage } from '../../../src/shared/types';

describe('Transcript Module', () => {
    describe('formatChronologicalPairs', () => {
        it('should format simple pairs correctly', () => {
            const messages: ChatMessage[] = [
                { id: '1', role: 'user', text: 'Hello', timestamp: 1 },
                { id: '2', role: 'assistant', text: 'Hi there', timestamp: 2 }
            ];
            
            const pairs = formatChronologicalPairs(messages);
            expect(pairs).toHaveLength(1);
            expect(pairs[0]).toBe("User message:\nHello\n\nAssistant message:\nHi there");
        });

        it('should combine consecutive messages from the same role', () => {
            const messages: ChatMessage[] = [
                { id: '1', role: 'user', text: 'Hello', timestamp: 1 },
                { id: '2', role: 'user', text: 'Anyone there?', timestamp: 2 },
                { id: '3', role: 'assistant', text: 'Hi there', timestamp: 3 },
                { id: '4', role: 'assistant', text: 'How can I help?', timestamp: 4 }
            ];
            
            const pairs = formatChronologicalPairs(messages);
            expect(pairs).toHaveLength(1);
            expect(pairs[0]).toBe("User message:\nHello\n\nUser message:\nAnyone there?\n\nAssistant message:\nHi there\n\nAssistant message:\nHow can I help?");
        });

        it('should separate multiple user-assistant pairs', () => {
            const messages: ChatMessage[] = [
                { id: '1', role: 'user', text: 'Hello', timestamp: 1 },
                { id: '2', role: 'assistant', text: 'Hi', timestamp: 2 },
                { id: '3', role: 'user', text: 'Help', timestamp: 3 },
                { id: '4', role: 'assistant', text: 'Sure', timestamp: 4 }
            ];
            
            const pairs = formatChronologicalPairs(messages);
            expect(pairs).toHaveLength(2);
            expect(pairs[0]).toBe("User message:\nHello\n\nAssistant message:\nHi");
            expect(pairs[1]).toBe("User message:\nHelp\n\nAssistant message:\nSure");
        });

        it('should handle empty input', () => {
            expect(formatChronologicalPairs([])).toEqual([]);
        });
    });

    describe('chunkPairs', () => {
        it('should chunk correctly based on characters', () => {
            const pairs = [
                'A'.repeat(2000), // Pair 1
                'B'.repeat(1500), // Pair 2
                'C'.repeat(1000)  // Pair 3
            ];

            const chunks = chunkPairs(pairs, 3000);
            
            expect(chunks).toHaveLength(2);
            // First chunk should have Pair 1 (since 2000 + 1500 > 3000, Pair 2 goes to next)
            expect(chunks[0].messageCount).toBe(1);
            expect(chunks[0].text).toContain('A');
            expect(chunks[0].text).not.toContain('B');
            
            // Second chunk should have Pair 2 and Pair 3 (1500 + 1000 <= 3000)
            expect(chunks[1].messageCount).toBe(2);
            expect(chunks[1].text).toContain('B');
            expect(chunks[1].text).toContain('C');
        });

        it('should handle single huge pairs exceeding max limit by putting them in their own chunk', () => {
             const pairs = [
                'A'.repeat(4000)
            ];

            const chunks = chunkPairs(pairs, 3000);
            expect(chunks).toHaveLength(1);
            expect(chunks[0].messageCount).toBe(1);
            expect(chunks[0].text.length).toBe(4000);
        });
    });
});
