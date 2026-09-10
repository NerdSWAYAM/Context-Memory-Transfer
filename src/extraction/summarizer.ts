import { ChatMessage } from '../shared/types';
import { extractWorkingContext } from '../engine';

export async function summarize(messages: ChatMessage[], onProgress?: (partial: string) => void): Promise<string> {
    if (onProgress) {
        onProgress('Running deterministic summarization engine...');
    }

    try {
        const result = extractWorkingContext(messages);

        if (onProgress) {
            onProgress('Summarization complete!');
        }

        return result.formattedText || 'No context extracted.';
    } catch (error: any) {
        console.error('Summarization Error:', error);
        throw error;
    }
}