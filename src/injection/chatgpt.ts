import { SiteAdapter } from './adpaterInterface';

export const ChatGPTAdapter: SiteAdapter = {
  getInputElement(): HTMLElement | null {
    return document.querySelector('#prompt-textarea');
  },
  setInputText(text: string): void {
    const input = this.getInputElement();
    if (input) {
      input.textContent = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },
  triggerSend(): void {
    const sendButton = document.querySelector('button[data-testid="send-button"]') as HTMLElement;
    if (sendButton) sendButton.click();
  },
  getIconContainer(): HTMLElement | null {
    // Try to find the send button container for right-side placement
    const sendButton = document.querySelector('button[data-testid="send-button"]') || document.querySelector('button[aria-label="Send message"]');
    if (sendButton && sendButton.parentElement) {
      return sendButton.parentElement;
    }
    
    // Fallback to the wrapper of the textarea
    const textarea = this.getInputElement();
    if (textarea && textarea.parentElement) {
      return textarea.parentElement;
    }
    return null;
  }
};
