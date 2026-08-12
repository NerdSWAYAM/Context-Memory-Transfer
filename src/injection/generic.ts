import { SiteAdapter } from './adpaterInterface';

export const GenericAdapter: SiteAdapter = {
  getInputElement(): HTMLElement | null {
    return document.querySelector('textarea, div[contenteditable="true" i], input[type="text"]');
  },
  setInputText(text: string): void {
    const input = this.getInputElement();
    if (input) {
      if ('value' in input) {
        (input as HTMLInputElement | HTMLTextAreaElement).value = text;
      } else {
        input.textContent = text;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  },
  triggerSend(): void {
    const sendButton = document.querySelector('button[aria-label*="end" i], button[title*="end" i], button[type="submit"]') as HTMLElement;
    if (sendButton) sendButton.click();
  },
  getIconContainer(): HTMLElement | null {
    // 1. Try to find the Send button (including Submit for Perplexity)
    const sendButton = document.querySelector('button[aria-label*="end" i], button[title*="end" i], button[aria-label*="submit" i], button[type="submit"]');
    if (sendButton && sendButton.parentElement) {
      return sendButton.parentElement;
    }
    
    // 2. Try to find right controls via Voice, Mic, Options
    const rightBtn = document.querySelector('button[aria-label*="voice" i], button[aria-label*="microphone" i], button[aria-label*="model" i], button[aria-label*="setting" i], button[aria-label*="option" i]');
    if (rightBtn && rightBtn.parentElement) {
      return rightBtn.parentElement;
    }

    // 3. Try to find the bottom controls row by looking at the parent of the Attach (+) button
    const attachBtn = document.querySelector('button[aria-label*="attach" i], button[aria-label*="upload" i], button[aria-label*="file" i], button[aria-label*="image" i]');
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
