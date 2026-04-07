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
    pnpm install
    ```

### 3. Start the development server

Navigate to the core package and start the dev server:

```bash
cd packages/core
pnpm run dev
```

The application will typically be available at:
http://localhost:5529

---

## Commit Message Convention

Please follow these prefixes when writing commit messages:

- `feat:` — new features
- `fix:` — bug fixes
- `docs:` — documentation updates
- `style:` — formatting, missing semicolons, etc. (no logic changes)
- `refactor:` — code changes that neither fix a bug nor add a feature
- `test:` — adding or updating tests
- `chore:` — maintenance tasks (build, dependencies, etc.)

Example:

```bash
feat: add drag-and-drop event support
fix: resolve timezone offset issue in calendar view
```

---

## Pull Request Guidelines

To keep the project maintainable and easy to review:

- Keep each pull request focused on **one feature, bug fix, or refactor**
- Avoid mixing unrelated changes in a single PR
- Provide a clear description of:
  - What changed
  - Why it was needed

- Update documentation if necessary
- Add or update tests when applicable
- Ensure the project builds and runs correctly before submitting

---

## Development Tips

- Keep changes minimal and focused
- Follow existing code style and structure
- When in doubt, open an issue first to discuss your idea

---

## License and Contribution Terms

By submitting a contribution to this project, you represent that:

- The contribution is your original work, or you have the legal right to submit it.
- You grant DayFlow the right to use, modify, distribute, and relicense your contribution as part of both open source and commercial versions of the project.

---

Thanks again for contributing to **DayFlow**! 🚀
