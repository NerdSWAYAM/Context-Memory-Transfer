/*
 Each AI chat site has different DOM structure.
 The adapter interface exposes a method injectContext(text) 
 that finds the input, sets the value, and optionally triggers send. 
 This keeps injection logic clean and extensible.
*/

export interface SiteAdapter {
  /** Find the chat input element */
  getInputElement(): HTMLElement | null;

  /** Set the text of the input (handles contenteditable divs, textareas, etc.) */
  setInputText(text: string): void;

  /** Trigger the send button / Enter key */
  triggerSend(): void;

  /** (optional) Capture user/assistant messages from the page */
  getMessages?(): Message[];

  /** (optional) Find the container element to inject the Pokeball icon (used for fallback prepend) */
  getIconContainer?(): HTMLElement | null;

  /** (optional) Custom logic to insert the icon exactly where needed, bypassing getIconContainer prepend */
  insertIcon?(icon: HTMLElement): void;

  /** (optional) URL pattern this adapter handles */
  urlPatterns?: RegExp[];
}