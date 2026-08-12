import { SiteAdapter } from './adpaterInterface';

export const ClaudeAdapter: SiteAdapter = {
  getInputElement(): HTMLElement | null {
    return document.querySelector('div[contenteditable="true" i]');
  },
  setInputText(text: string): void {
    const input = this.getInputElement();
    if (input) {
      input.textContent = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },
  triggerSend(): void {
    const sendButton = document.querySelector('button[aria-label*="Send" i]') as HTMLElement;
    if (sendButton) sendButton.click();
  },
  getIconContainer(): HTMLElement | null {
    // 1. Try to find Send button (when typing)
    const sendButton = document.querySelector('button[aria-label*="Send" i]');
    if (sendButton && sendButton.parentElement) {
        return sendButton.parentElement;
    }
    
    // 2. Try to find the right controls container using known persistent buttons (like Voice/Mic or model selector)
    const rightBtn = document.querySelector('button[aria-label*="voice" i], button[aria-label*="microphone" i], button[aria-label*="model" i]');
    if (rightBtn && rightBtn.parentElement) {
      return rightBtn.parentElement;
    }
    
    // 3. Try to find the bottom controls row by looking at the parent of the Attach (+) button
    const attachBtn = document.querySelector('button[aria-label*="attach" i], button[aria-label*="upload" i]');
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
  },
  insertIcon(icon: HTMLElement): void {
    // In Claude, the entire bottom row might be one flex container.
    // We want to insert the icon before the right-side controls (Model selector or Mic).
    
    // 1. Try to find the Mic button, which is usually present on the right
    const micBtn = document.querySelector('button[aria-label*="voice" i], button[aria-label*="microphone" i]');
    if (micBtn && micBtn.parentElement) {
      const container = micBtn.parentElement;
      
      // Check if there is a Model selector before the Mic button
      // Usually, the Model selector is the immediate previous sibling
      let targetNode = micBtn;
      if (micBtn.previousElementSibling && micBtn.previousElementSibling.tagName.toLowerCase() === 'button') {
        targetNode = micBtn.previousElementSibling;
      }
      
      icon.style.marginRight = '8px';
      container.insertBefore(icon, targetNode);
      return;
    }

    // Fallback: prepend to the standard container
    const container = this.getIconContainer();
    if (container) {
      container.prepend(icon);
    }
  }
};
