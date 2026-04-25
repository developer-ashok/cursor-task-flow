# Cursor Task Flow 🚀

**Cursor Task Flow** is a productivity-focused VS Code (Cursor) extension designed to streamline your AI-driven development. It allows you to maintain a library of predefined tasks or prompts and inject them directly into the Cursor Chat window with a single click.

## 🌟 Key Features

- **Project-Local Storage**: Tasks are stored in a `.promptingtasks` file at the root of your project, making it easy to share tasks with your team via version control.
- **One-Click Injection**: Instantly populate the Cursor AI Chat or Composer with your selected task prompt.
- **Customizable Prompts**: Create, edit, and categorize your own prompt templates directly in the file or through the UI.
- **Auto-Generation**: The extension automatically initializes the `.promptingtasks` file if it doesn't exist.
- **Telegram Live Sync**: Send prompts from your phone via Telegram and have them automatically injected into Cursor.

## 🚀 Setup Telegram Sync

You can "speak" or type prompts from your phone directly into Cursor!

1.  **Create a Bot**: Message [@BotFather](https://t.me/botfather) on Telegram and create a new bot to get your **API Token**.
2.  **Open Settings**: In Cursor, go to `Settings` > `Extensions` > `Cursor Task Flow`.
3.  **Paste Token**: Paste your token into the **Telegram Bot Token** field.
4.  **Enable**: Check the **Enable Telegram Sync** box.
5.  **Start Chatting**: Open your new bot in Telegram and send a message.

## 📱 Telegram Remote Control

Your bot is now a full remote task manager:

- **`/tasks`**: See your tasks with interactive buttons (▶️ to run, 🗑️ to delete).
- **`/add_task`**: Starts a conversation to add a new task remotely.
- **`/help`**: Shows a summary of available commands.
- **Bot Menu**: Tap the `[/]` button in Telegram to see the prefilled command list.
- **Direct Input**: Anything else you type is treated as a raw prompt.
- **`/send`**: Add this at the end of any text (e.g., `Refactor this /send`) to auto-submit the prompt.

## 🛠 Tech Stack

- **Framework**: VS Code Extension API
- **Language**: TypeScript
- **Storage**: JSON-based `.promptingtasks` file

## 📂 Project Structure

```text
├── src/
│   ├── extension.ts      # Main entry point
│   ├── taskProvider.ts   # TreeView logic (reads from .promptingtasks)
│   └── taskManager.ts    # File I/O for .promptingtasks
├── package.json          # Extension manifest
└── README.md             # Project documentation

> **Note**: The `.promptingtasks` file is **not** part of this repository's source code. It is automatically generated in the **root of any project** where you use this extension.
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Cursor](https://cursor.sh/)

### Installation & Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/cursor-task-flow.git
   cd cursor-task-flow
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Launch the extension**:
   - Press `F5` in Cursor to open a new window with the extension loaded.
   - The extension will detect or create `.promptingtasks` in your open workspace.

## 🗺 Roadmap

- [x] Concept & README
- [ ] Initialize Extension Project
- [ ] Implement `.promptingtasks` detection and auto-generation
- [ ] Implement Sidebar TreeView to list tasks from the file
- [ ] Implement Cursor Chat Injection logic
- [ ] Add UI for adding/editing tasks (updates the file)

## 🤝 Support & Author

**Author**: Ashok Chandrapal  
**GitHub**: [@developer-ashok](https://github.com/developer-ashok)  
**Email**: [developer7039@gmail.com](mailto:developer7039@gmail.com)

If you find this extension helpful, consider supporting the development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/coderubix)

---
*Created with ❤️ for the Cursor community.*
