import { ChatMessage } from './types';

export interface TranscriptChunk {
    text: string;
    messageCount: number;
}

export function formatChronologicalPairs(messages: ChatMessage[]): string[] {
    const pairs: string[] = [];
    let currentPair = '';
    let lastRole = '';

    for (const msg of messages) {
        const role = msg.role.toLowerCase();
        
        // If we switch from assistant back to user, we've completed a pair
        if (role === 'user' && lastRole === 'assistant') {
            if (currentPair) {
                pairs.push(currentPair.trim());
                currentPair = '';
            }
        }

        const roleHeader = role === 'user' ? 'User' : 'Assistant';
        currentPair += `${roleHeader} message:\n${msg.text}\n\n`;
        lastRole = role;
    }

    if (currentPair) {
        pairs.push(currentPair.trim());
    }

    return pairs;
}

export function chunkPairs(pairs: string[], maxCharsPerChunk: number = 3000): TranscriptChunk[] {
    const chunks: TranscriptChunk[] = [];
    let currentText = '';
    let count = 0;

    for (const pair of pairs) {
        if (currentText.length + pair.length > maxCharsPerChunk && count > 0) {
            chunks.push({ text: currentText.trim(), messageCount: count });
            currentText = '';
            count = 0;
        }
        currentText += pair + '\n\n';
        count++;
    }

    if (currentText) {
        chunks.push({ text: currentText.trim(), messageCount: count });
    }
    return chunks;
}
