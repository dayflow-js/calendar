# Contributing to DayFlow

First of all, thank you for your interest in contributing to **DayFlow** 🎉

DayFlow is an open-source calendar UI designed to work well across **web and desktop applications**. We welcome all kinds of contributions — from bug reports and documentation improvements to new features and performance optimizations.

---

## Ways to Contribute

You can contribute in many ways:

* 🐞 Reporting bugs
* 💡 Suggesting new features or improvements
* 📝 Improving documentation or examples
* 🎨 UI/UX improvements
* ⚙️ Performance optimizations
* 🔧 Refactoring or code quality improvements

If you're not sure where to start, feel free to open an issue and start a discussion.

---

## Before You Start

* Please search existing **issues** and **pull requests** before opening a new one.
* For large changes, it’s recommended to open an issue first to discuss your idea.
* Be respectful and constructive — this is a collaborative project.

---

## Development Setup

### Prerequisites

* Node.js (LTS recommended)
* pnpm (recommended) or npm

### Install Dependencies

```bash
pnpm install
```

### Start Development

```bash
pnpm dev
```

Make sure all packages build correctly before making changes.

---

## Coding Guidelines

* Use **TypeScript** where applicable
* Follow existing code style and patterns
* Keep components **small and composable**
* Avoid unnecessary abstractions
* Prefer clarity over cleverness

If you add new APIs, please consider backward compatibility.

---

## Styling Guidelines

DayFlow uses **Tailwind CSS v4**:

* Avoid global CSS leakage
* Prefer component-scoped styles
* Use existing design tokens and CSS variables when possible
* Keep class names consistent with existing components

---

## Commit Messages

Please use clear and descriptive commit messages. Recommended format:

```
feat: add support for week range selection
fix: correct all-day event spacing in month view
docs: improve getting started guide
```

---

## Pull Request Guidelines

* Keep PRs focused and reasonably sized
* Clearly describe **what** and **why**
* Link related issues if applicable
* Include screenshots or GIFs for UI changes

Once submitted:

* Maintainers may request changes or suggestions
* Please be patient — reviews may take some time

---

## Reporting Bugs

When reporting a bug, please include:

* DayFlow version
* Environment (web / desktop, framework, OS)
* Steps to reproduce
* Expected vs actual behavior
* Screenshots or videos if helpful

---

## Feature Requests

We welcome feature ideas! Please include:

* The problem you’re trying to solve
* Why it’s useful
* Any prior art or references (e.g. macOS Calendar, Google Calendar)

---

## Code of Conduct

By participating in this project, you agree to follow our **Code of Conduct**.
Please be respectful, inclusive, and constructive.

---

## Questions?

If you have questions:

* Open a discussion or issue
* Ask in the PR comments

Thanks again for contributing to **DayFlow** — every contribution matters ❤️
