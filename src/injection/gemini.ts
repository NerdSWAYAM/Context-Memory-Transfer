import { SiteAdapter } from './adpaterInterface';

export const GeminiAdapter: SiteAdapter = {
  getInputElement(): HTMLElement | null {
    return document.querySelector('div[contenteditable="true" i]') || document.querySelector('textarea');
  },
  setInputText(text: string): void {
    const input = this.getInputElement();
    if (input) {
      input.textContent = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },
  triggerSend(): void {
    const sendButton = document.querySelector('button[aria-label*="Send" i]') || document.querySelector('.send-button');
    if (sendButton) (sendButton as HTMLElement).click();
  },
  getIconContainer(): HTMLElement | null {
    // 1. Try to find the Send button (when typing)
    const sendButton = document.querySelector('button[aria-label*="Send" i]') || document.querySelector('.send-button');
    if (sendButton && sendButton.parentElement) {
      return sendButton.parentElement;
    }
    
    // 2. Try to find right controls container via Microphone or Model selector (always visible)
    const rightBtn = document.querySelector('button[aria-label*="microphone" i], button[aria-label*="voice" i], button[aria-label*="model" i], button[aria-label*="Select" i]:not([aria-label*="image" i])');
    if (rightBtn && rightBtn.parentElement) {
      return rightBtn.parentElement;
    }

    // 3. Try to find the bottom controls row by looking at the parent of the + (upload) button
    const attachBtn = document.querySelector('button[aria-label*="upload" i], button[aria-label*="image" i], button[aria-label*="file" i]');
    if (attachBtn && attachBtn.parentElement && attachBtn.parentElement.parentElement) {
      const bottomRow = attachBtn.parentElement.parentElement;
      if (bottomRow.lastElementChild && bottomRow.lastElementChild !== attachBtn.parentElement) {
        return bottomRow.lastElementChild as HTMLElement;
      }
    }

    // 4. Fallback to input parent
    const input = this.getInputElement();
    if (input && input.parentElement) {
      return input.parentElement;
    }
    return null;
  }
};
