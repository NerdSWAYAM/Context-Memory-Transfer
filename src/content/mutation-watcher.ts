export class MutationWatcher {
  private observer: MutationObserver | null = null;
  private onMessageExtracted: (node: Element) => void;

  constructor(onMessageExtracted: (node: Element) => void) {
    this.onMessageExtracted = onMessageExtracted;
  }

  public start() {
    console.log('[Fallback] Starting MutationWatcher');
    this.observer = new MutationObserver((mutations) => this.processMutations(mutations));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  public stop() {
    console.log('[Fallback] Stopping MutationWatcher');
    this.observer?.disconnect();
    this.observer = null;
  }

  private processMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.hasAttribute('data-message-author-role')) {
              this.onMessageExtracted(element);
            }
            const childMessages = element.querySelectorAll('[data-message-author-role]');
            childMessages.forEach((child) => this.onMessageExtracted(child));
          }
        });
      } else if (mutation.type === 'characterData') {
        let target: Element | null = null;
        if (mutation.target.nodeType === Node.ELEMENT_NODE) {
          target = (mutation.target as Element).closest('[data-message-author-role]');
        } else if (mutation.target.parentElement) {
          target = mutation.target.parentElement.closest('[data-message-author-role]');
        }
        if (target) {
          this.onMessageExtracted(target);
        }
      }
    }
  }
}
