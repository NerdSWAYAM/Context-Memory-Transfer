export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | string;
  text: string;
  timestamp: number;
  chatId?: string; // Foreign key to Conversation
}

export interface Conversation {
  id: string;
  nativeChatId: string;
  platform: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  summary?: string;
  version: number;
}

export interface ConversationMetadata {
  nativeId: string;
  platform: string;
  title: string;
}

export interface NormalizedConversation {
  id: string;
  provider: string;
  title: string;
  messages: ChatMessage[];
  capturedAt: number;
  embedding?: number[] | null;
}

export interface ProviderAdapter {
  provider: string;
  detect(): boolean;
  getConversationId(): string | null;
  fetchFullConversation(id: string): Promise<NormalizedConversation>;
  extractFromDom(): Promise<NormalizedConversation>;
}
