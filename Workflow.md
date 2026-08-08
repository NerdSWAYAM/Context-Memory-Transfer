# Extension Workflow Documentation

This document outlines the step-by-step technical workflow implemented for **Context Memory Transfer**.

---

## Phase 0: Project Setup & Environment Setup

The goal of Phase 0 is to set up a modern development environment using TypeScript, Vite, and CRXJS to build a Manifest V3 (MV3) Chrome Extension.

### 1. Package Initialization
- Initialized Node package configuration (`package.json`) set to `"type": "module"`.
- Installed key dependencies:
  - **`vite`**: Modern build tool and bundler.
  - **`@crxjs/vite-plugin`**: Vite plugin specifically designed for building Chrome extensions with support for Hot Module Replacement (HMR) and native TypeScript handling.
  - **`typescript`**: Type checking and compilation support.

### 2. Configuration Files
- **TypeScript Configuration (`tsconfig.json`)**: Configured to support ESNext features, DOM typings, JSON module imports, and bundler resolution.
- **Vite Configuration (`vite.config.ts`)**: Integrates the CRXJS plugin with the Extension Manifest (`public/manifest.json`).
- **Manifest V3 (`public/manifest.json`)**:
  - Updated background service worker entry to point directly to `src/background/index.ts`.
  - Updated content scripts to match `https://chatgpt.com/*` and `https://chat.openai.com/*` pointing to `src/content/capture.ts`.

---

## Phase 1: Capture (Message Interception)

The goal of Phase 1 is to intercept user prompts and assistant replies in real time from a target AI chat interface (e.g., ChatGPT) and store them in memory and session storage.

```
+-------------------------------------------------------+
|                 ChatGPT Webpage                       |
|   (DOM Elements: [data-message-author-role])          |
+-------------------------------------------------------+
                           |
                           | 1. MutationObserver watches DOM
                           v
+-------------------------------------------------------+
|            Content Script (capture.ts)                |
|  - Identifies user/assistant role & text              |
|  - Tracks processed elements via WeakSet              |
|  - Formats message object (id, role, text, timestamp) |
+-------------------------------------------------------+
                           |
                           | 2. chrome.runtime.sendMessage
                           v
+-------------------------------------------------------+
|          Background Script (index.ts)                 |
|  - Receives message event                             |
|  - Logs message to console                            |
|  - Saves to memory array (`messageStore`)             |
|  - Saves to `chrome.storage.session`                  |
+-------------------------------------------------------+
```

### 1. Shared Data Contract (`src/shared/types.ts`)
Defines the structure of intercepted messages:
- `id`: Unique identifier for the message.
- `role`: Role of the message sender (`user`, `assistant`, etc.).
- `text`: Extracted plain-text content of the message.
- `timestamp`: Epoch timestamp (ms) of when the message was captured.

### 2. Content Script (`src/content/capture.ts`)
- **DOM Watching**: Uses a `MutationObserver` to monitor `document.body` for newly inserted child nodes and subtree changes.
- **Element Filtering**: Looks for nodes containing the attribute `data-message-author-role` (ChatGPT's selector for chat messages).
- **Text Extraction**:
  - For assistant messages: Targets inner text within `.markdown` sub-elements.
  - For user messages: Extracts inner text from the message container.
- **Deduplication**: Uses a JavaScript `WeakSet` to track processed DOM elements and prevent duplicate captures.
- **Initial Load Capture**: Scans existing messages in the DOM when the page first loads.
- **Message Dispatch**: Sends structured `ChatMessage` objects to the background script using `chrome.runtime.sendMessage`.

### 3. Background Script (`src/background/index.ts`)
- **Message Listener**: Registers a `chrome.runtime.onMessage` listener to receive `NEW_CHAT_MESSAGE` actions.
- **In-Memory Storage**: Stores messages in a temporary `messageStore` array.
- **Session Persistence**: Writes incoming messages to `chrome.storage.session` to keep data persisted even when the background service worker temporarily goes idle.

---

## How to Test the Workflow

1. **Build the extension**:
   ```bash
   npm run build
   ```
2. **Load into Chrome**:
   - Open `chrome://extensions`.
   - Enable **Developer mode** (top right).
   - Click **Load unpacked** and select the `dist` folder.
3. **Verify Message Capture**:
   - Navigate to [ChatGPT](https://chatgpt.com).
   - Open DevTools (`F12`) on the page to see content script logs (`[Context Memory Transfer] Captured new messages...`).
   - Inspect the Background Service Worker console on `chrome://extensions` to see stored messages in the background script.

---

## Phase 2: Storage (Persistent Local Data)

The goal of Phase 2 is to move from temporary in-memory storage to a persistent local database using IndexedDB, abstracted elegantly with **Dexie.js**. This phase also introduces an extension popup UI to view and manage this stored history.

### 1. Database Setup (`src/storage/db.ts`)
- **IndexedDB via Dexie**: Created an instance of `ContextMemoryDB` extending `Dexie`.
- **Schema Definition**: Added a `rawMessages` table with `id` as the primary key and indexed fields for `role`, `timestamp`, and `chatId` for fast querying.
- **Exported Instance**: Exposed a singleton `db` instance for use across the extension.

### 2. Background Script Integration (`src/background/index.ts`)
- Modified the message receiver to insert intercepted messages directly into `db.rawMessages.put(payload)`. 
- Leverages the fact that Service Workers in Manifest V3 have full access to IndexedDB, allowing seamless background data persistence.

### 3. Extension Popup UI (`src/ui/popup/`)
- **HTML Layout (`popup.html`)**: Added a container for the message list and a "Clear History" button.
- **Logic (`popup.ts`)**:
  - Connects directly to the Dexie `db` instance.
  - **Read**: Fetches the last 20 messages ordered by timestamp using `db.rawMessages.orderBy('timestamp').reverse().limit(20).toArray()` and dynamically renders them into the UI.
  - **Delete**: Wires the "Clear History" button to `db.rawMessages.clear()` to wipe the local database and refresh the UI.
