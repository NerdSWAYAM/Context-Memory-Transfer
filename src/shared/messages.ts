import { NormalizedConversation } from './types';

export type CaptureStage =
  | 'detect'
  | 'api'
  | 'fallback'
  | 'scroll'
  | 'extract'
  | 'dedup'
  | 'validate'
  | 'storage'
  | 'done'
  | 'error';

export interface CaptureProgress {
  stage: CaptureStage;
  message: string;
  provider?: string;
  conversationId?: string;
  messageCount?: number;
  duplicateCount?: number;
  usedFallback?: boolean;
}

export interface CaptureResult {
  success: boolean;
  conversationId?: string;
  provider?: string;
  messageCount?: number;
  usedFallback?: boolean;
  duplicateCount?: number;
  error?: string;
}

export type BackgroundMessage =
  | { type: 'REQUEST_API_CAPTURE'; payload: ApiCaptureRequest }
  | { type: 'SAVE_CONVERSATION'; payload: { conversation: NormalizedConversation } }
  | { type: 'NEW_CHAT_MESSAGE'; payload: { message: import('./types').ChatMessage; conversation: import('./types').ConversationMetadata } }
  | { type: 'GET_CHAT_MESSAGES'; payload: { nativeChatId: string } }
  | { type: 'SUMMARIZE_CONVERSATION'; payload: { nativeChatId: string | null } };

export interface ApiCaptureRequest {
  provider: string;
  id: string;
  apiBase: string;
}

export type ApiCaptureResponse =
  | { success: true; data: unknown }
  | { success: false; error: string };

export type SaveConversationResponse =
  | { success: true }
  | { success: false; error: string };

export type ContentMessage =
  | { type: 'TRIGGER_CAPTURE' }
  | { type: 'GET_CONVERSATION_INFO' };

export type RuntimeMessage =
  | BackgroundMessage
  | ContentMessage
  | { type: 'CAPTURE_PROGRESS'; progress: CaptureProgress };
