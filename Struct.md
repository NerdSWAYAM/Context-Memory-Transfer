context-memory-extension/
├── public/
│   ├── manifest.json               # Extension manifest (MV3)
│   ├── icons/                      # 16/48/128 icons
│   └── _locales/                   # (optional) i18n
│
├── src/
│   ├── background/                 # Service worker (entry: background.ts)
│   │   ├── index.ts                # Main service worker, message routing
│   │   └── offscreen.ts            # Offscreen document host for heavy ML
│   │
│   ├── content/                    # Content scripts injected into chat pages
│   │   ├── capture.ts              # DOM observer / message interceptor
│   │   └── injection.ts            # Finds input field, pastes context
│   │
│   ├── ui/                         # Popup / Sidebar (HTML/CSS/TS)
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   ├── style.css
│   │   │   ├── popup.ts            # Main logic, event handlers
│   │   │   └── components/         # Reusable UI components (vanilla or Preact)
│   │   └── sidebar/                # (if using sidePanel API)
│   │       ├── index.html
│   │       └── ...
│   │
│   ├── extraction/                 # Summarizer & Entity extractor
│   │   ├── pipeline.ts             # Orchestrates summarise → entities → embed
│   │   ├── summarizer.ts           # Transformers.js summarisation (e.g., distilbart)
│   │   ├── entity-extractor.ts     # NER / structured extraction
│   │   └── prompts.ts              # Prompt templates for the models
│   │
│   ├── ml/                         # Model loading & inference worker
│   │   ├── worker.ts               # Web Worker that runs Transformers.js
│   │   ├── model-loader.ts         # Downloads/caches models, pipelines
│   │   └── embedder.ts             # Embedding generation (MiniLM)
│   │
│   ├── storage/                    # IndexedDB via Dexie + vector search
│   │   ├── db.ts                   # Dexie database schema
│   │   ├── context-store.ts        # CRUD operations for context artifacts
│   │   ├── vector-index.ts         # In‑memory cosine similarity search
│   │   └── export-import.ts        # JSON / Markdown export logic
│   │
│   ├── injection/                  # Site‑specific adapters
│   │   ├── adapter-interface.ts    # Common interface for all adapters
│   │   ├── chatgpt.ts
│   │   ├── claude.ts
│   │   └── gemini.ts
│   │
│   ├── shared/                     # Shared types, utils, constants
│   │   ├── types.ts                # Context, Entity, Message interfaces
│   │   ├── utils.ts                # Helpers (serialization, time formatting)
│   │   └── constants.ts            # Model names, storage keys
│   │
│   └── assets/                     # Static assets bundled by Vite (images, etc.)
│
├── scripts/                        # (optional) Dev scripts
├── tests/                          # Unit & e2e tests
├── package.json
├── tsconfig.json
├── vite.config.ts                  # Vite config with @crxjs/vite-plugin
└── README.md