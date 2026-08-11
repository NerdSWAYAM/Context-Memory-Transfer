export async function summarize(transcript: string, onProgress?: (partial: string) => void): Promise<string> {
    if (onProgress) {
        onProgress('Sending transcript to OpenRouter for summarization...');
    }

    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    let apiUrl = import.meta.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions';
    if (!apiUrl.endsWith('/chat/completions')) {
        apiUrl = apiUrl.replace(/\/$/, '') + '/chat/completions';
    }

    if (!apiKey) {
        throw new Error('OpenRouter API key is missing. Please check your .env file.');
    }

    const prompt = `Please summarize the following conversation chronologically and clearly:\n\n${transcript}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                // Optional headers for OpenRouter rankings
                'HTTP-Referer': 'https://github.com/Context-Memory',
                'X-OpenRouter-Title': 'Poké Context Memory',
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                max_tokens: 500, // Reasonable limit for a summary to avoid credit issues
                messages: [
                    {
                        role: "system",
                        content: "",
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