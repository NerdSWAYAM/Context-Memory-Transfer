import { ProviderAdapter } from '../shared/types';
import { ChatGPTAdapter } from './providers/chatgpt';
import { ClaudeAdapter } from './providers/claude';
import { GeminiAdapter } from './providers/gemini';
import { DeepSeekAdapter } from './providers/deepseek';
import { GenericAdapter } from './providers/generic';

const registry: ProviderAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
  new DeepSeekAdapter(),
  new GenericAdapter(), // Always last as a fallback
];

export function detectProvider(): ProviderAdapter {
  for (const adapter of registry) {
    if (adapter.detect()) {
      return adapter;
    }
  }
  return new GenericAdapter();
}
