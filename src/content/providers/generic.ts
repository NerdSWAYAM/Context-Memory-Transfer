import { ProviderAdapter, NormalizedConversation } from '../../shared/types';
import { scanFullDom } from '../dom-extractor';
import { scrollToTopToLoadHistory } from '../scroll-engine';

export class GenericAdapter implements ProviderAdapter {
  provider = 'generic';

  detect(): boolean {
    return true;
  }

  getConversationId(): string | null {
    return `generic_${window.location.pathname.replace(/\W+/g, '_') || 'root'}`;
  }

  async fetchFullConversation(_id: string): Promise<NormalizedConversation> {
    console.log('[API] GenericAdapter does not support API fetch — forcing fallback');
    throw new Error('API capture not supported on generic sites');
  }

  async extractFromDom(): Promise<NormalizedConversation> {
    console.log('[Fallback] GenericAdapter extracting from DOM');

    const scrollContainer =
      document.querySelector('main') ??
      document.querySelector('[class*="overflow-y-auto"]') ??
      document.documentElement;

    await scrollToTopToLoadHistory(scrollContainer);

    const conversationId = this.getConversationId() as string;
    const messages = scanFullDom(conversationId);

    return {
      id: conversationId,
      provider: this.provider,
      title: document.title || 'Captured Conversation',
      messages,
      capturedAt: Date.now(),
      embedding: null,
    };
  }
}
