# Become An Author (NovelCrafter Clone)

**Become An Author** is a powerful, offline-first novel writing application designed to help authors plan, write, and organize their stories. Built with modern web technologies, it offers a seamless writing experience with advanced features like AI assistance, world-building tools (Codex), and comprehensive manuscript management.

## 🚀 Key Features

### 📖 Manuscript Management
*   **Structure**: Organize your novel into **Acts**, **Chapters**, and **Scenes**.
*   **Drag & Drop**: Reorder your story elements easily.
*   **Timeline View**: Visualize your story's flow with word counts, POV, and AI context status.

### ✍️ Rich Text Editor
*   **Tiptap Integration**: A robust block-based editor.
*   **Typewriter Mode**: Keeps your active line centered for distraction-free writing.
*   **Slash Commands**: Quickly insert headings, lists, and more.
*   **Smart Replacements**: Automatic smart quotes and typography enhancements.

### 🌍 Codex (World Building)
*   **Database**: Create entries for **Characters**, **Locations**, **Items**, and **Lore**.
*   **Mentions**: Type `@` to quickly link Codex entries in your manuscript.
*   **Details**: Add images, aliases, and custom attributes to your entries.

### 🤖 AI Assistance
*   **Multi-Provider Support**: Connect with **OpenRouter**, **Google Gemini**, **Anthropic**, or **Ollama** (Local AI).
*   **Context-Aware**: The AI knows your story! It uses your manuscript and Codex entries to provide relevant suggestions.
*   **Tools**:
    *   **Chat**: Discuss your story with an AI co-author.
    *   **Rewrite**: Rephrase, expand, or shorten text.
    *   **Summarize**: Generate scene summaries automatically.

### 💾 Offline-First & Data
*   **IndexedDB**: All data is stored locally in your browser using Dexie.js.
*   **Privacy**: Your story never leaves your device unless you use an external AI provider.
*   **Import/Export**:
    *   **Backup**: Export your entire project as a JSON file.
    *   **Publish**: Export your manuscript as a formatted **.docx** file.

## 🛠️ Tech Stack

*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
*   **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
*   **Editor**: [Tiptap](https://tiptap.dev/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Export**: [docx](https://docx.js.org/)

## 💻 Getting Started (For Contributors)

Follow these steps to set up the project locally:

### Prerequisites
*   Node.js (v18 or higher)
*   npm, yarn, or pnpm

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/become-an-author.git
    cd become-an-author
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Open the app**:
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ai/              # AI-related components (Chat, Model Selector)
│   ├── chat/            # Chat interface components
│   ├── codex/           # Codex (World building) components
│   ├── editor/          # Tiptap editor and manuscript tools
│   ├── ui/              # Reusable UI components (Buttons, Dialogs, etc.)
│   └── ...
├── hooks/               # Custom React hooks (useAutoSave, useImportExport)
├── lib/                 # Utilities, database config, types
│   ├── db.ts            # Dexie database schema
│   ├── ai-service.ts    # AI integration logic
│   └── ...
├── store/               # Zustand stores (Project state, Formatting)
└── ...
```

## 📝 Usage Guide

### Creating a Project
1.  Click **"Create New Novel"** on the home screen.
2.  Enter a title, author name, and optional description.
3.  Choose a cover image or let the app generate a placeholder.

### Writing
1.  Use the **Sidebar** to create Acts, Chapters, and Scenes.
2.  Select a **Scene** to start writing in the editor.
3.  Use the **Timeline** (right panel) to see your story's flow.

### Using AI
1.  Go to **Settings** (Thunder icon) -> **AI Connections**.
2.  Enter your API Key for your preferred provider (e.g., OpenRouter, Gemini).
3.  Select a model from the **Model Selector** in the top right.
4.  Open the **Chat** (right sidebar) or use **Slash Commands** (`/`) in the editor.

### Exporting
1.  Go to the **Home Screen**.
2.  Click the menu (⋮) on your project card.
3.  Select **Export Manuscript DOCX** for a Word document or **Export Project JSON** for a backup.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
