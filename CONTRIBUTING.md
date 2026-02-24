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

3.  **Start the development server:**
    Go to the core package directory and start the Vite server to launch the example application.
    ```bash
    cd packages/core
    pnpm run dev
    ```
    The application typically runs at `http://localhost:5529`.

`feat:` - for new features  
`fix:` - for bug fixes  
`docs:` - for documentation updates  
`style:` - for code style changes (formatting, missing semi-colons, etc.)  
`refactor:` - for code refactoring without adding features or fixing bugs  
`test:` - for adding or updating tests  
`chore:` - for maintenance tasks (build process, dependencies, etc.)