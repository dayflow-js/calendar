# Contribution Guide

Thank you for your interest in contributing to **DayFlow**! We welcome contributions from the community. Please follow this guide to set up the project and ensure your contributions align with our standards.

## 🚀 How to Start the Project

If you have forked the repository and want to run the examples locally, follow these steps:

1.  **Clone your fork:**

    ```bash
    git clone https://github.com/YOUR_USERNAME/DayFlow.git
    cd DayFlow
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Start the development server:**
    This command will start the Vite server and launch the example application.
    ```bash
    npm run dev
    ```
    The application typically runs at `http://localhost:5529`.

## 📝 Commit Message Guidelines

We follow a strict convention for commit messages to keep the history clean and readable. Please use the appropriate emoji and type for your changes. _Inspired by [siyuan-note](https://github.com/siyuan-note/siyuan)_

| Emoji | Type     | Meaning              | When to Use                          | Example                            |
| ----- | -------- | -------------------- | ------------------------------------ | ---------------------------------- |
| ✨    | feat     | New feature          | Add new functionality                | ✨ feat: add event search drawer   |
| 🐛    | fix      | Bug fix              | Fix errors or incorrect behavior     | 🐛 fix: crash when result is empty |
| ⚡    | perf     | Performance          | Improve speed or efficiency          | ⚡ perf: debounce search input     |
| ♻️    | refactor | Refactor             | Code changes without behavior change | ♻️ refactor: extract search hook   |
| 🎨    | style    | Code style           | Formatting, lint, structure          | 🎨 style: format calendar code     |
| 💄    | style    | UI styling           | Visual/UI-only changes               | 💄 style: improve empty state UI   |
| 📝    | docs     | Documentation        | README, comments, docs               | 📝 docs: update search API         |
| 🌐    | i18n     | Internationalization | Add or update translations           | 🌐 i18n: add empty result texts    |
| 🙈    | chore    | Ignore files         | Update `.gitignore`                  | 🙈 ignore log files                |
| 🧑‍💻    | dx       | Developer Experience | Improve tooling, DX, types           | 🧑‍💻 improve TypeScript types        |
| 🚨    | fix      | Critical fix         | Emergency issues, lint errors        | 🚨 fix: production crash           |
| 🔒    | security | Security             | Fix security vulnerabilities         | 🔒 fix: prevent XSS                |
| 🔥    | remove   | Removal              | Remove code, files, features         | 🔥 remove legacy API               |
| 🔖    | release  | Release              | Versioning, tagging                  | 🔖 release: v0.7.0                 |
