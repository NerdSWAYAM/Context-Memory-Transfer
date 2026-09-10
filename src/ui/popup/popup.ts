import { ChatMessage, ConversationMetadata } from '../../shared/types';
import { db } from '../../storage/db';

// const TRANSFER_PREFIX = `We are starting a fresh session. I am pasting the context brief from our previous conversation below. Read it to fully absorb the state of the project, adopt this context as our baseline, and wait for my next instruction without saying anything other than that you are ready.`;
const TRANSFER_PREFIX = `The following is Extracted Working Context from a previous AI conversation.
It was produced by a deterministic extractive process. It is not a complete transcript and may omit information from the original conversation.
Treat this context as prior working context for the conversation. Preserve the latest confirmed goals, requirements, constraints, decisions, current state, open issues, and next actions.
Do not invent missing information or assume omitted information is false. Do not treat suggestions, questions, or superseded decisions as current unless the context explicitly indicates they were confirmed.`

const TRANSFER_POSTFIX = `Continue the conversation from this working context.
Use the context to avoid repeating decisions or work that has already been settled. Prefer the latest confirmed state over older alternatives.
You may provide new information or recommendations when needed, but do not claim that newly generated information came from the previous conversation.
If the context is insufficient to answer correctly, ask for the missing information rather than guessing.`

let currentNativeChatId: string | null = null;

// In-memory map of conversation ID → summary text for quick card-click lookup
const summaryMap = new Map<string, string>();

// ── Relative time formatter ────────────────────────────────────────────────
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 10) {
    const d = new Date(timestamp);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

// ── Tab switching ──────────────────────────────────────────────────────────
function setupTabs() {
  const tabCapture = document.getElementById('tab-capture')!;
  const tabTransfer = document.getElementById('tab-transfer')!;
  const capturePanel = document.getElementById('capture-panel')!;
  const transferPanel = document.getElementById('transfer-panel')!;

  // body starts with capture-mode class set in HTML

  tabCapture.addEventListener('click', () => {
    tabCapture.classList.add('active');
    tabTransfer.classList.remove('active');
    capturePanel.classList.add('active');
    transferPanel.classList.remove('active');
    document.body.classList.add('capture-mode');
    document.body.classList.remove('transfer-mode');
  });

  tabTransfer.addEventListener('click', () => {
    tabTransfer.classList.add('active');
    tabCapture.classList.remove('active');
    transferPanel.classList.add('active');
    capturePanel.classList.remove('active');
    document.body.classList.add('transfer-mode');
    document.body.classList.remove('capture-mode');

    // Refresh the transfer cards when switching to the tab
    loadAllSummaries();
  });
}

// ── Pokéball drag interaction ──────────────────────────────────────────────
// function setupPokeball() {
//   const pokeball = document.getElementById('pokeball') as HTMLImageElement;
//   if (!pokeball) return;

//   // Load pokeball image from extension public assets
//   pokeball.src = chrome.runtime.getURL('icons/pokeball.png');

//   let isDragging = false;
//   let startX = 0;
//   let startY = 0;

//   pokeball.addEventListener('mousedown', (e: MouseEvent) => {
//     isDragging = true;
//     startX = e.clientX;
//     startY = e.clientY;
//     pokeball.classList.add('dragging');
//     // Remove default transition so drag feels immediate
//     pokeball.style.transition = 'filter 0.08s ease';
//     e.preventDefault();
//   });

//   document.addEventListener('mousemove', (e: MouseEvent) => {
//     if (!isDragging) return;
//     const dx = e.clientX - startX;
//     const dy = e.clientY - startY;
//     pokeball.style.transform =
//       `translateX(calc(-50% + ${dx}px)) translateY(${dy}px) scale(1.1)`;
//   });

//   document.addEventListener('mouseup', () => {
//     if (!isDragging) return;
//     isDragging = false;
//     pokeball.classList.remove('dragging');

//     // Bounce back to original position with spring easing
//     pokeball.style.transition =
//       'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease';
//     pokeball.style.transform = 'translateX(-50%)';

//     setTimeout(() => {
//       pokeball.style.transition = '';
//     }, 450);
//   });
// }

// ── Load messages into hidden data list ────────────────────────────────────
async function loadMessages() {
  const listElement = document.getElementById('message-list');
  const titleElement = document.getElementById('active-chat-title');
  if (!listElement) return;

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab || !activeTab.id) {
      listElement.innerHTML = '<li><em>No active tab found.</em></li>';
      if (titleElement) titleElement.textContent = 'Unknown Context';
      return;
    }

    let meta: ConversationMetadata | null = null;
    try {
      meta = await chrome.tabs.sendMessage(activeTab.id, { type: 'GET_CONVERSATION_INFO' });
    } catch (e) {
      listElement.innerHTML = '<li><em>No supported chat detected on this page.</em></li>';
      if (titleElement) titleElement.textContent = 'Inactive / Not a chat page';
      return;
    }

    if (!meta || !meta.nativeId) {
      listElement.innerHTML = '<li><em>Could not detect conversation.</em></li>';
      if (titleElement) titleElement.textContent = 'Unknown Chat';
      return;
    }

    currentNativeChatId = meta.nativeId;
    if (titleElement) {
      titleElement.textContent = meta.title.length > 50 ? meta.title.substring(0, 50) + '...' : meta.title;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'GET_CHAT_MESSAGES',
      payload: { nativeChatId: currentNativeChatId },
    });

    const messages: ChatMessage[] = response.messages || [];

    listElement.innerHTML = '';

    if (messages.length === 0) {
      listElement.innerHTML = '<li><em>No messages captured in this chat yet.</em></li>';
      return;
    }

    messages.reverse().slice(0, 50).forEach((msg) => {
      const li = document.createElement('li');
      li.className = `message-item ${msg.role}`;

      const roleBadge = document.createElement('span');
      roleBadge.className = 'role-badge';
      roleBadge.textContent = msg.role;

      const textPreview = document.createElement('div');
      textPreview.className = 'text-preview';
      textPreview.textContent =
        msg.text.length > 100 ? msg.text.substring(0, 100) + '...' : msg.text;

      li.appendChild(roleBadge);
      li.appendChild(textPreview);
      listElement.appendChild(li);
    });
  } catch (error) {
    console.error('Failed to load messages:', error);
    listElement.innerHTML = '<li class="error">Error loading messages</li>';
  }
}

// ── Build a single chat card element ───────────────────────────────────────
interface CardData {
  id: string;
  nativeChatId: string;
  title: string;
  updatedAt: number;
  version: number;
  summary: string;
  platform: string;
}

function createCardElement(card: CardData): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'transfer-card';
  btn.setAttribute('aria-label', `Transfer: ${card.title}`);

  // Content container
  const content = document.createElement('div');
  content.className = 'transfer-card__content';

  const titleEl = document.createElement('div');
  titleEl.className = 'transfer-card__title';
  titleEl.textContent = card.title.length > 35 ? card.title.substring(0, 35) + '…' : card.title;

  const metaRow = document.createElement('div');
  metaRow.className = 'transfer-card__meta';

  const dateEl = document.createElement('span');
  dateEl.className = 'transfer-card__date';
  dateEl.textContent = formatRelativeTime(card.updatedAt);

  const versionEl = document.createElement('span');
  versionEl.className = 'transfer-card__version';
  versionEl.textContent = `v${card.version}`;

  metaRow.appendChild(dateEl);
  metaRow.appendChild(versionEl);
  content.appendChild(titleEl);
  content.appendChild(metaRow);

  btn.appendChild(content);

  // Click → transfer this conversation's summary
  btn.addEventListener('click', () => handleCardClick(card.id));

  return btn;
}

// ── Render all summary cards in the Transfer panel ─────────────────────────
function renderTransferCards(conversations: CardData[]) {
  const container = document.getElementById('transfer-cards-container');
  const emptyMsg = document.getElementById('transfer-empty-msg');
  if (!container) return;

  // Clear existing cards (keep empty msg element)
  const existingCards = container.querySelectorAll('.transfer-card');
  existingCards.forEach(c => c.remove());

  // Update summary map
  summaryMap.clear();
  conversations.forEach(c => {
    summaryMap.set(c.id, c.summary);
  });

  if (conversations.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  console.log(`[Transfer] Rendering ${conversations.length} conversation cards.`);
  conversations.forEach(conv => {
    try {
      const card = createCardElement(conv);
      container.appendChild(card);
    } catch (e) {
      console.error('[Transfer] Failed to create card for', conv, e);
    }
  });
}

// ── Load all summaries from DB via service worker ──────────────────────────
async function loadAllSummaries() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_SUMMARIES' });
    if (response?.conversations) {
      renderTransferCards(response.conversations);
    }
  } catch (err) {
    console.warn('Failed to load summaries:', err);
  }
}

// ── Handle card click: inject summary into active chat ─────────────────────
async function handleCardClick(conversationId: string) {
  const summary = summaryMap.get(conversationId);
  if (!summary) return;

  const textToInject = `${TRANSFER_PREFIX}\n\n${summary}\n\n${TRANSFER_POSTFIX}`;

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) return;

  try {
    await chrome.tabs.sendMessage(activeTab.id, {
      type: 'INJECT_AND_SEND',
      payload: { text: textToInject },
    });
  } catch (err) {
    console.warn('Inject failed, attempting scripting.executeScript fallback:', err);
    // Fallback: use executeScript to inject into the page
    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: injectTextIntoPage,
        args: [textToInject],
      });
    } catch (fallbackErr: any) {
      const msg = fallbackErr?.message || String(fallbackErr);
      alert(`Transfer failed. Please ensure you are on a supported chat page and refresh if necessary.\n\nDetails: ${msg}`);
    }
  }
}

// ── Pokéball capture animation state ───────────────────────────────────────
const POKEBALL_ANIMATION = {
  OPEN_MS: 500,
  GOTCHA_MS: 820,
} as const;

type PokeballState = 'idle' | 'open' | 'rock';

function setPokeballState(state: PokeballState) {
  const ball = document.getElementById('pokeball-sprite');
  if (!ball) return;

  ball.classList.remove('idle', 'open', 'rock', 'bounce');
  ball.classList.add(state);
}

function showGotchaEffect() {
  const effect = document.getElementById('capture-gotcha');
  if (!effect) return;

  effect.classList.remove('is-visible');
  // Force a reflow so every capture reliably replays the effect.
  void effect.offsetWidth;
  effect.classList.add('is-visible');

  window.setTimeout(() => {
    effect.classList.remove('is-visible');
  }, POKEBALL_ANIMATION.GOTCHA_MS);
}

function sleep(ms: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, ms));
}

async function playCaptureStartSequence() {
  setPokeballState('open');
  await sleep(POKEBALL_ANIMATION.OPEN_MS);
  setPokeballState('rock');
}

function finishCaptureSequence() {
  showGotchaEffect();
  window.setTimeout(() => {
    setPokeballState('idle');
  }, POKEBALL_ANIMATION.GOTCHA_MS);
}

// ── Setup all button listeners ─────────────────────────────────────────────
function setupListeners() {
  // ── Refresh button: reload transfer cards ──────────────────────────
  const refreshBtn = document.getElementById('refresh-transfer-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const originalText = refreshBtn.textContent;
      refreshBtn.textContent = '...';
      await loadAllSummaries();
      refreshBtn.textContent = originalText;
    });
  }

  // ── Capture button: capture transcript → auto-summarise → save to Transfer tab
  const captureBtn = document.getElementById('capture-btn');
  const captureStatus = document.getElementById('capture-status');

  if (captureBtn) {
    captureBtn.addEventListener('click', async () => {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) return;

      const url = activeTab.url || '';
      const isSupported = [
        'chatgpt.com',
        'chat.openai.com',
        'gemini.google.com',
        'chat.deepseek.com',
        'claude.ai'
      ].some(domain => url.includes(domain));

      if (!isSupported) {
        if (captureStatus) {
          captureStatus.style.display = 'block';
          captureStatus.classList.add('status-bar--error');
          captureStatus.textContent = 'Capture failed: Please open a supported chat page (ChatGPT, Claude, Gemini, DeepSeek).';
        }
        return;
      }

      captureBtn.setAttribute('disabled', 'true');

      // Start the visual sequence immediately. The rock state is intentionally
      // held until the complete capture + summary backend flow finishes.
      const animationSequence = playCaptureStartSequence();
      let captureSucceeded = false;

      if (captureStatus) {
        captureStatus.style.display = 'none';
        captureStatus.classList.remove('status-bar--error');
        captureStatus.textContent = '';
      }

      const progressListener = (message: { type?: string; progress?: { message?: string } }) => {
        // Success progress messages removed as per user request
      };
      chrome.runtime.onMessage.addListener(progressListener);

      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'TRIGGER_CAPTURE' });
        if (response?.success) {
          await loadMessages();

          // ── Auto-summarise after capture ────────────────────────────

          const mlListener = (message: any) => {
            // ML progress messages removed as per user request
          };
          chrome.runtime.onMessage.addListener(mlListener);

          try {
            const sumResponse = await chrome.runtime.sendMessage({
              type: 'SUMMARIZE_CONVERSATION',
              payload: { nativeChatId: currentNativeChatId },
            });

            if (sumResponse.error) {
              if (captureStatus) {
                captureStatus.style.display = 'block';
                captureStatus.classList.add('status-bar--error');
                captureStatus.textContent = `Summary error: ${sumResponse.error}`;
              }
            } else if (sumResponse.summary) {
              // Refresh the transfer cards to show the new/updated entry
              await loadAllSummaries();
              // if (captureStatus) captureStatus.textContent = 'Done! Summary saved to Transfer tab.';

              captureSucceeded = true;

              // Do not show GOTCHA until every backend step above has completed.
              await animationSequence;
              finishCaptureSequence();
            }
          } catch (sumErr: any) {
            const msg = sumErr?.message ? String(sumErr.message) : String(sumErr);
            if (captureStatus) {
              captureStatus.style.display = 'block';
              captureStatus.classList.add('status-bar--error');
              captureStatus.textContent = `Summary error: ${msg}`;
            }
          } finally {
            chrome.runtime.onMessage.removeListener(mlListener);
          }
        } else {
          const err = response?.error || 'Unknown error';
          if (captureStatus) {
            captureStatus.style.display = 'block';
            captureStatus.classList.add('status-bar--error');
            captureStatus.textContent = `Capture failed: ${err}`;
          }
        }
      } catch (err: any) {
        if (captureStatus) {
          captureStatus.style.display = 'block';
          captureStatus.classList.add('status-bar--error');
          const errMsg = err?.message || '';
          if (errMsg.includes('Receiving end does not exist') || errMsg.includes('establish connection')) {
            captureStatus.textContent =
              'Connection failed. Please refresh the chat page and try again.';
          } else {
            captureStatus.textContent = `Capture error: ${errMsg || 'Could not reach content script.'}`;
          }
        }
      } finally {
        chrome.runtime.onMessage.removeListener(progressListener);
        captureBtn.removeAttribute('disabled');

        // If capture/summary failed, still complete the 0.5s open phase and
        // then return to idle so the Pokéball can never remain stuck rocking.
        if (!captureSucceeded) {
          await animationSequence;
          setPokeballState('idle');
        }
      }
    });
  }
}

/**
 * Injected into the active page to paste text into the chat input and send it.
 * Works for ChatGPT, Claude, Gemini, DeepSeek by trying common selectors.
 */
function injectTextIntoPage(text: string) {
  // Known input selectors for various AI chats
  const selectors = [
    '#prompt-textarea',                      // ChatGPT
    'div[contenteditable="true"].ProseMirror', // Claude
    'div[contenteditable="true"]',           // Gemini / generic
    'textarea',                              // DeepSeek / fallback
  ];

  let input: HTMLElement | null = null;
  for (const sel of selectors) {
    input = document.querySelector(sel);
    if (input) break;
  }

  if (!input) {
    console.error('[Transfer] Could not find chat input on this page.');
    return;
  }

  // For contenteditable divs
  if (input.getAttribute('contenteditable') === 'true') {
    input.focus();
    input.innerHTML = '';
    // Use a <p> to preserve newlines in contenteditable
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      const p = document.createElement('p');
      p.textContent = line || '\u200B'; // zero-width space for blank lines
      input!.appendChild(p);
    });
    // Dispatch an input event so the framework picks up the change
    input.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (input instanceof HTMLTextAreaElement) {
    // For textarea elements
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype, 'value'
    )?.set;
    nativeInputValueSetter?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  setupTabs();
  setPokeballState('idle');
  await loadAllSummaries();
  await loadMessages();
  setupListeners();
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', init);