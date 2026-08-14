import { ProviderAdapter } from '../shared/types';
import { ChatGPTAdapter } from './providers/chatgpt';
import { GenericAdapter } from './providers/generic';

const registry: ProviderAdapter[] = [
  new ChatGPTAdapter(),
  new GenericAdapter() // Always last as a fallback
];

export function detectProvider(): ProviderAdapter {
  for (const adapter of registry) {
    if (adapter.detect()) {
      return adapter;
    }
  }
  return new GenericAdapter();
}
