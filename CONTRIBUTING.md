# Contributing to Poké Context Ball

Thank you for your interest in contributing to **Poké Context Ball**! 🎉

Poké Context Ball is an open-source browser extension focused on capturing, organizing, and transferring useful context from AI conversations.

Whether you want to fix a bug, improve the UI, add tests, work on browser compatibility, or help improve the documentation, your contribution is welcome.

---

## 📌 Before You Start

Please take a moment to:

1. Read this guide.
2. Check the existing [issues](https://github.com/NerdSWAYAM/Context-Memory-Transfer/issues).
3. Search for existing pull requests before starting duplicate work.
4. Read the project documentation, especially:
   - [`README.md`](./README.md)
   - [`Workflow.md`](./Workflow.md)
   - [`Struct.md`](./Struct.md)

For larger changes, opening an issue first is recommended so the approach can be discussed before implementation.

---

## 🛠️ Tech Stack

The project currently uses:

- **TypeScript**
- **Vite**
- **CRXJS**
- **HTML / CSS**
- **Chrome Extension Manifest V3**
- **IndexedDB**
- **Dexie.js**

The project is primarily developed and tested on Chromium-based browsers.

---

## 🚀 Setting Up the Project

### 1. Fork the repository

Create your own fork of:

```text
https://github.com/NerdSWAYAM/Context-Memory-Transfer
```

### 2. Clone your fork

```bash
git clone https://github.com/<your-username>/Context-Memory-Transfer.git
cd Context-Memory-Transfer
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start development

```bash
npm run dev
```

### 5. Build the extension

```bash
npm run build
```

After building, load the generated extension directory through the browser's extension developer settings.

---

## 🌿 Branching Strategy

Please avoid making changes directly on the `main` branch.

Use a dedicated branch for your work.

Recommended naming conventions:

```text
feature/<feature-name>
fix/<bug-name>
test/<test-name>
docs/<documentation-change>
refactor/<change-name>
chore/<maintenance-task>
```

### Examples

```text
feature/firefox-support
fix/message-capture
test/popup-tests
docs/update-installation
refactor/storage-layer
```

---

## 🧩 Types of Contributions

There are many ways to contribute.

### 🐛 Bug Fixes

Found something that does not work correctly?

Open an issue with:

- A clear description of the problem
- Steps to reproduce it
- Expected behavior
- Actual behavior
- Browser and version
- Screenshots, console logs, or recordings when useful

---

### ✨ New Features

Before implementing a significant feature:

1. Open an issue describing the idea.
2. Explain the problem it solves.
3. Discuss the proposed approach.
4. Wait for feedback before starting large changes.

This helps avoid duplicated work and keeps the architecture consistent.

---

### 🧪 Testing

**Testing is one of the current priorities of the project.**

Contributors can help by:

- Writing unit tests
- Writing integration tests
- Testing message capture
- Testing IndexedDB persistence
- Testing popup behavior
- Testing clear-history functionality
- Testing different Chromium-based browsers
- Finding edge cases in AI chat interfaces
- Reproducing reported bugs

### Useful skills

- TypeScript
- Vite
- HTML / CSS
- Basic JavaScript knowledge
- Basic understanding of Chromium browsers
- Basic understanding of browser extensions

You do not need to be an expert. Contributors who want to learn while working on a real open-source browser-extension project are encouraged to participate.

---

### 🎨 UI / UX

You can contribute by improving:

- Popup design
- Animations
- Accessibility
- Responsive behavior
- Visual consistency
- User feedback and interaction states

For visual changes, include screenshots or a short recording in your pull request when possible.

---

### 📖 Documentation

Documentation contributions are highly valuable.

You can improve:

- README documentation
- Setup instructions
- Development guides
- Architecture documentation
- API and code comments
- Troubleshooting guides
- Contribution documentation

---

### 🌐 Browser Compatibility

The project is being developed with Chromium-based browsers in mind, with broader browser compatibility planned.

Contributors can help test and improve compatibility across:

- Google Chrome
- Microsoft Edge
- Brave
- Opera
- Other Chromium-based browsers

**Firefox support is also planned.**

---

## 💻 Code Guidelines

### TypeScript

Prefer:

- Strong typing
- Clear interfaces and types
- Small, focused functions
- Descriptive variable and function names
- Reusable utilities instead of duplicated logic

Avoid:

- Unnecessary `any`
- Large functions with multiple responsibilities
- Unrelated changes in the same pull request

### General

Keep code:

- Readable
- Maintainable
- Modular
- Consistent with the existing project structure

Before introducing a new dependency, consider whether the functionality can be implemented using the existing stack.

---

## 🧪 Testing Your Changes

Before opening a pull request, make sure your changes work locally.

At minimum:

```bash
npm run build
```

Then load the built extension into a Chromium-based browser and verify the affected functionality.

For changes involving conversation capture, also test:

- New messages
- Multiple consecutive messages
- Different message roles
- Dynamic content updates
- Page reloads
- Navigation between conversations

---

## 📝 Commit Messages

Write clear and meaningful commit messages.

Recommended format:

```text
<type>: <short description>
```

Examples:

```text
feat: add message capture validation
fix: prevent duplicate message storage
test: add popup history tests
docs: update contributor guide
refactor: simplify storage service
chore: update dependencies
```

Keep commits focused on one logical change whenever possible.

---

## 🔄 Pull Request Process

When your changes are ready:

### 1. Push your branch

```bash
git push origin <your-branch>
```

### 2. Open a Pull Request

Create a pull request against the repository's `main` branch.

### 3. Describe your changes

A good pull request should include:

```text
## What changed?

Briefly describe the implementation.

## Why?

Explain the problem or motivation.

## How was it tested?

Describe the testing performed.

## Screenshots / recordings

Add visual evidence for UI changes when useful.

## Related issue

Closes #<issue-number>
```

### 4. Review

Maintainers may request changes before the pull request is merged.

Please treat review comments as part of the collaboration process and respond to requested changes constructively.

---

## ✅ Pull Request Checklist

Before submitting your pull request:

- [ ] I created a dedicated branch.
- [ ] I tested my changes locally.
- [ ] `npm run build` completes successfully.
- [ ] I kept the changes focused.
- [ ] I did not commit unnecessary files.
- [ ] I updated documentation when required.
- [ ] I added tests where appropriate.
- [ ] I included screenshots or recordings for relevant UI changes.
- [ ] My commit messages clearly describe the changes.
- [ ] I have checked for existing issues or pull requests covering the same work.

---

## 🚨 Reporting Security Issues

Please do **not** publicly disclose security vulnerabilities through a normal GitHub issue.

For sensitive security concerns, use the private security reporting options available through GitHub, when configured, or contact the project maintainer directly.

---

## 💬 Communication

For questions, feature discussions, or ideas, use GitHub Issues or Discussions where available.

When opening an issue, provide enough context for another contributor to understand and reproduce the problem without needing additional information.

---

## 🌱 Good First Contributions

New to open source?

Some good starting points include:

- Documentation improvements
- UI polish
- Small bug fixes
- Test cases
- Browser compatibility testing
- Reproduction of reported bugs
- Improving error messages
- Adding comments or developer documentation

Look for issues labeled:

```text
good first issue
help wanted
testing
documentation
```

---

## ⭐ Recognition

Open-source projects are built by communities.

Contributors who help improve Poké Context Memory through code, testing, documentation, design, bug reports, or ideas are greatly appreciated.

Every contribution helps make the project more reliable and useful.

---

## 📜 License

By contributing to this project, you agree that your contributions will be licensed under the project's **MIT License**, unless otherwise stated.

See [`LICENSE`](./LICENSE) for details.

---

<div align="center">

### ⚡ Gotta catch your context!

Thank you for contributing to **Poké Context Memory**. 💙

**Capture it. Store it. Transfer it.**

</div>
