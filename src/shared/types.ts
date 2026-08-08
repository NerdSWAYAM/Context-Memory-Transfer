export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | string;
  text: string;
  timestamp: number;
  chatId?: string;
}
