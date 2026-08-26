<div align="center">
  <img src="./public/icons/pokeball.png" width="60" height="60" alt="Poké Context Memory icon"/>
  <img src="./src/assests/POKe%20context%20ball%20LOGO.png" width="400" alt="Poké Context Memory logo"/>

  <h2><em>Gotta capture your AI context!</em></h2>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-available-brightgreen)](https://chrome.google.com/webstore)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-coming_soon-orange)](https://addons.mozilla.org)

</div>

---

## About the Project

**Poké Context Ball** is an open-source browser extension designed to help you capture and transfer useful context from LLM conversations.

Modern LLM workflows often involve switching between different conversations, models, and platforms. Important decisions, code, requirements, and reasoning can easily get lost when starting a new chat.

Poké Context Ball approaches this problem like a **Pokédex for your LLM conversations**: capture useful conversation data, organize it as reusable context, and make it available when you need to continue your work.

> **Project status:** 🛠️ Active development
> The core capture and local-storage workflow is being implemented incrementally, while context extraction, transfer, testing, and broader browser/platform support are under active development.

---

## 🎯 Problem

Working with multiple AI assistants can create a common problem:

```text
Conversation A
     │
     │ Important context
     ▼
New conversation / Different LLM
     │
     └── No Context, Start from new
```

Users often have to manually copy:

* Requirements
* Previous decisions
* Important explanations
* Code snippets
* Project details
* Constraints
* Conversation history

This becomes increasingly difficult as conversations become longer and AI-assisted projects become more complex.

### 💡 The Goal

Poké Context Ball aims to make this workflow easier:

```text
LLM Conversation
      │
      ▼
   Capture Context with extension
      │
      ▼
  Store Context
      │
      ▼
  Inner logic
      │
      ▼
 Transfer to another AI
```

---

## Contribution
Contributions are welcome!
Visit ```[CONTRIBUTING.md](CONTRIBUTING.md)``` for more information on how to contribute to this project.

---

## Tech Stack

### Core

* **TypeScript**
* **Vite**
* **CRXJS Vite Plugin**
* **Chrome Extensions Manifest V3**

### Storage

* **IndexedDB**
* **Dexie.js**

### Planned AI / Context Processing

* **Transformers.js**
* Local language models
* Local embeddings
* Vector similarity search

The current package configuration includes Vite, CRXJS, TypeScript, Dexie, and Geist.

---

## 📁 Project Structure

```text
Context-Memory-Transfer/
│
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── ...
│
├── src/
│   ├── background/
│   │   ├── index.ts
│   │   └── offscreen.ts
│   │
│   ├── content/
│   │   ├── capture.ts
│   │   └── injection.ts
│   │
│   ├── ui/
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   ├── style.css
│   │   │   └── popup.ts
│   │   └── sidebar/
│   │
│   ├── extraction/
│   │   ├── pipeline.ts
│   │   ├── summarizer.ts
│   │   ├── entity-extractor.ts
│   │   └── prompts.ts
│   │
│   ├── ml/
│   │   ├── worker.ts
│   │   ├── model-loader.ts
│   │   └── embedder.ts
│   │
│   ├── storage/
│   │   ├── db.ts
│   │   ├── context-store.ts
│   │   ├── vector-index.ts
│   │   └── export-import.ts
│   │
│   ├── injection/
│   │   ├── adapter-interface.ts
│   │   ├── chatgpt.ts
│   │   ├── claude.ts
│   │   └── gemini.ts
│   │
│   ├── shared/
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── constants.ts
│   │
│   └── assets/
│
├── tests/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

The repository currently contains the extension source, public assets, build configuration, workflow documentation, and project structure documentation.

---


### Prerequisites

Make sure you have:

* Node.js
* npm
* Google Chrome or another Chromium-based browser
* Basic knowledge of TypeScript and browser extensions

### 1. Clone the repository

```bash
git clone https://github.com/NerdSWAYAM/Context-Memory-Transfer.git

cd Context-Memory-Transfer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Build the extension

```bash
npm run build
```

The repository currently defines Vite development and production build scripts through `npm run dev` and `npm run build`.

---

## 🌐 Load the Extension in Chrome

After building the project:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Select **Load unpacked**
4. Choose the generated `dist` directory
5. Open a supported AI chat website
6. Inspect the extension/content-script logs to verify message capture

The documented workflow currently uses Chrome's **Load unpacked** flow and verifies capture through the ChatGPT page and extension service-worker console.

---

## 🧪 Testing

Testing is currently an important area of development.

We are looking for contributors who can help improve reliability by:

* Writing unit tests
* Creating integration tests
* Testing message capture
* Testing storage behavior
* Testing popup functionality
* Testing different Chromium-based browsers
* Finding edge cases in AI chat interfaces
* Reporting and reproducing bugs

### Contribution Opportunity

**Required / useful skills:**

* TypeScript
* Vite
* HTML
* CSS
* Basic understanding of Chromium-based browsers
* Basic understanding of Chrome Extensions

You do not need to be an expert in every part of the project. Contributors interested in learning while working on a real open-source browser extension are welcome.

---

## 📚 Technical Documentation

Additional technical documentation is available in the repository:

* [`Workflow.md`](./Workflow.md) — implementation workflow and development phases
* [`Struct.md`](./Struct.md) — planned/current source architecture
* [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md) — third-party licensing information

The repository currently maintains 10 commits and includes dedicated workflow, structure, and third-party licensing documentation.

---

## 📦 Browser Support

### Current

* Chromium-based browsers
* Chrome development/testing

### Planned

* Firefox
* Broader Chromium compatibility
* Cross-browser WebExtension compatibility

---

## License

This project is intended to be open source under the **MIT License**.

See [`LICENSE`](./LICENSE) for the complete license text.

Third-party assets and code may have separate licensing requirements; see [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md).

---


## 🔗 Links

**Repository:**
https://github.com/NerdSWAYAM/Context-Memory-Transfer

**Issues:**
https://github.com/NerdSWAYAM/Context-Memory-Transfer/issues

---

<div align="center">

### ⚡ Gotta catch your context!

**Poké Context Memory**
*Capture it. Store it. Transfer it.*

</div>
