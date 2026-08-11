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
}

export interface ConversationMetadata {
  nativeId: string;
  platform: string;
  title: string;
}
