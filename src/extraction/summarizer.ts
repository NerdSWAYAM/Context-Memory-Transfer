import { cleanTranscript } from './preprocess';

export async function summarize(transcript: string, onProgress?: (partial: string) => void): Promise<string> {
    const cleanedTranscript = cleanTranscript(transcript);

    if (onProgress) {
        onProgress('Poke Ball Capturing the Context...');
    }

    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    let apiUrl = import.meta.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions';
    if (!apiUrl.endsWith('/chat/completions')) {
        apiUrl = apiUrl.replace(/\/$/, '') + '/chat/completions';
    }

    if (!apiKey) {
        throw new Error('OpenRouter API key is missing. Please check your .env file.');
    }

    const prompt = `${cleanedTranscript}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                // Optional headers for OpenRouter rankings
                'HTTP-Referer': 'https://github.com/NerdSWAYAM/Context-Memory-Transfer',
                'X-OpenRouter-Title': 'Poké Context Ball',
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                max_tokens: 500, // Reasonable limit for a summary to avoid credit issues
                messages: [
                    {
                        role: "system",
                        content: `
                        You are a Context Memory Extractor.
                        Your task is to read a conversation between a user and an AI assistant, and produce a **structured, fact-dense summary** that another AI can use to fully understand the context and continue the work.
                        Rules:
                        - Do NOT narrate the conversation; only extract and structure the information.
                        - Use the following sections exactly:
                        ## Goal
                        (What is the user ultimately trying to achieve?)
                        ## Key Decisions
                        (Any choices made and why, in bullet points)
                        ## Technical Details
                        (Code snippets, API names, version numbers, exact commands)
                        ## Warnings & Pitfalls
                        (Things the assistant warned about, potential problems)
                        ## Next Steps
                        (Unfinished tasks or planned actions)
                        - Keep each section concise but complete. Omit sections if no relevant info exists.
                        - Never add speculation; only use what is stated in the transcript.
                        `,
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('OpenRouter API Error:', data);
            throw new Error(data.error?.message || 'Failed to generate summary from OpenRouter');
        }

        if (onProgress) {
            onProgress('Summarization complete!');
        }

        return data.choices[0]?.message?.content || 'No summary generated.';
    } catch (error: any) {
        console.error('Summarization Error:', error);
        throw error;
    }
}