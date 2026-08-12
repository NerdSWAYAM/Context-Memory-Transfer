import { SiteAdapter } from './adpaterInterface';

export const DeepSeekAdapter: SiteAdapter = {
  getInputElement(): HTMLElement | null {
    return document.querySelector('#chat-input') || document.querySelector('textarea');
  },
  setInputText(text: string): void {
    const input = this.getInputElement();
    if (input) {
      if ('value' in input) {
        (input as HTMLTextAreaElement).value = text;
      } else {
        input.textContent = text;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },
  triggerSend(): void {
    const sendButton = document.querySelector('.ds-button__background, button[aria-label*="send" i], div[aria-label*="send" i]') as HTMLElement; 
    if (sendButton) sendButton.click();
  },
  getIconContainer(): HTMLElement | null {
    // DeepSeek uses a div with role button often, or ds-icon-button.
    // Try to find the specific container for right-side controls
    const rightContainer = document.querySelector('.ds-chat-input--right') || document.querySelector('div[class*="right" i]:has(.ds-icon-button)');
    if (rightContainer) {
      return rightContainer as HTMLElement;
    }

    const sendButton = document.querySelector('.ds-icon-button, button[aria-label*="send" i]'); 
    if (sendButton && sendButton.parentElement) {
      return sendButton.parentElement;
    }
    
    const input = this.getInputElement();
    if (input && input.parentElement) {
      return input.parentElement;
    }
    return null;
  },
  insertIcon(icon: HTMLElement): void {
    // The user identified .ds-button__background as the send button in their triggerSend.
    // The actual button is the parent of .ds-button__background.
    const bg = document.querySelector('.ds-button__background');
    if (bg && bg.parentElement && bg.parentElement.parentElement) {
      // bg.parentElement is the button itself (ds-button--primary)
      const button = bg.parentElement;
      const container = button.parentElement;
      
      // Give the Pokeball a little margin to match the spacing
      icon.style.marginRight = '8px';
      
      container.insertBefore(icon, button);
      return;
    }

    // Fallback logic
    const container = this.getIconContainer();
    if (container) {
      container.prepend(icon);
    }
  }
};
