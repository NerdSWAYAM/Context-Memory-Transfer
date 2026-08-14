export async function scrollToTopToLoadHistory(
  scrollElement: Element,
  maxAttempts: number = 25
): Promise<void> {
  console.log('[Scroll] Initiating DOM auto-scroll for history fallback');

  let stablePasses = 0;

  for (let i = 0; i < maxAttempts; i++) {
    const prevHeight = scrollElement.scrollHeight;
    const prevMessageCount = document.querySelectorAll('[data-message-author-role]').length;

    if ('scrollTop' in scrollElement) {
      (scrollElement as HTMLElement).scrollTop = 0;
    }

    scrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));
    window.dispatchEvent(new Event('scroll'));

    await new Promise((resolve) => setTimeout(resolve, 900));

    const newHeight = scrollElement.scrollHeight;
    const newMessageCount = document.querySelectorAll('[data-message-author-role]').length;

    if (newHeight === prevHeight && newMessageCount === prevMessageCount) {
      stablePasses += 1;
      if (stablePasses >= 2) {
        console.log(`[Scroll] Reached top after ${i + 1} attempts (${newMessageCount} messages visible)`);
        break;
      }
    } else {
      stablePasses = 0;
    }
  }
}
