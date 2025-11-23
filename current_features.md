# Complete Feature Audit - Source of Truth
**Last Updated:** 2025-11-23  
**Purpose:** Comprehensive inventory of ALL functioning features, APIs, and database connections

---

## 1. PROJECT MANAGEMENT

### Project CRUD Operations
- **Create New Project**: Dialog with title, author, genre, language, cover image, series grouping
- **Open Existing Projects**: Dashboard with project grid/list view
- **Edit Project Settings**: Full metadata management dialog
  - Title, author, language selection
  - Cover image upload (1.6:1 aspect ratio)
  - Series assignment
- **Archive Projects**: Soft delete with recovery option
- **Delete Projects**: Hard delete with cascading removal of all related data (nodes, codex, snippets, chat threads)
- **Project Export**: Full project backup to JSON with Dexie export

### Series Management
- Create series to group related projects
- Assign projects to series
- Series displayed in project grid

---

## 2. MANUSCRIPT STRUCTURE

### Hierarchical Organization
- **Acts**: Top-level organizational units
- **Chapters**: Mid-level grouping within acts
- **Scenes**: Individual writing units with content

### Node Operations
- **Create**: Add acts, chapters, or scenes via dialog or navigation menu
- **Rename**: Inline editing of node titles
- **Reorder**: Drag-and-drop reordering using dnd-kit
- **Delete**: Remove nodes (with confirmation)
- **Duplicate**: Clone scenes with content
- **Navigate**: Click to activate scene in editor

### Scene-Specific Features
- **POV Assignment**: Set point-of-view character
- **Subtitle**: Additional scene descriptor (e.g., "3 days later")
- **Status**: Draft, Revised, Final
- **Labels**: Tags for organization (custom strings)
- **Summary**: AI-generated or manual scene summary
- **Word Count**: Automatic tracking
- **Scene Beats**: Structured plot points within scenes
- **AI Exclusion Flag**: Exclude scene from AI context

---

## 3. RICH TEXT EDITOR (TIPTAP)

### Core Extensions
- **StarterKit**: Paragraphs, headings (H1-H6), bold, italic, strike, code
- **Typography**: Smart quotes, ellipsis, em-dashes
- **Character Count**: Word and character tracking
- **Placeholder**: Custom placeholder text
- **Mentions**: `@` to link to Codex entries

### Text Formatting
- **Bold** (Cmd/Ctrl+B)
- **Italic** (Cmd/Ctrl+I)
- **Underline** (Cmd/Ctrl+U)
- **Strike-through**
- **Headings** (H1-H6)
- **Bullet Lists**
- **Ordered Lists**
- **Blockquotes**
- **Code Blocks**
- **Horizontal Rules**

### Custom Features
- **Sections**: Colored content blocks with AI context toggle
- **Slash Commands** (`/`):
  - Scene Beat
  -Continue Writing
  - Insert Section
  - Horizontal Rule

### Editor Behavior
- **Auto-save**: Debounced saves (1 second delay for manual typing)
- **Immediate save**: On AI-generated content insertion
- **Scene Isolation**: React key-based remounting prevents cross-scene contamination
- **Format Settings**: Font family, size, line height, alignment, page width

### Keyboard Shortcuts
- **Cmd/Ctrl+J**: Open Continue Writing menu
- **Cmd/Ctrl+B**: Bold
- **Cmd/Ctrl+I**: Italic
- **Enter**: Send message (in chat)
- **Shift+Enter**: New line (in chat)

---

## 4. AI WRITING TOOLS

### Continue Writing (Cmd+J)
- **Scene Beat**: Generate pivotal story moments
- **Continue Writing**: Natural story continuation
- **Codex Progression**: Suggest worldbuilding updates
- **Tweak Dialog**: Customize word count, instructions, model, context

### Text Selection Tools
- **Expand**: Lengthen selected text
- **Rephrase**: Rewrite in different words
- **Shorten**: Condense selected text
- All support custom instructions and context selection

### Scene Actions (via dropdown menu)
- **Summarize Scene**: AI-generated summary
- **Detect Characters**: Identify character mentions (planned)
- **Chat with Scene**: Context-aware conversation (planned)

### Context Selection
- Hierarchical selection of:
  - Acts, Chapters, Scenes
  - Codex Entries (by type, category, tag)
  - Snippets
- Multi-select with clear all option

---

## 5. CHAT INTERFACE

### Thread Management
- **Auto-create**: New thread on first project visit
- **Auto-load**: Most recent thread loads on return
- **Persistence**: All messages saved to IndexedDB
- **Threading**: Multiple threads per project
- **Pinning**: Pin important threads (UI planned)
- **Archiving**: Archive old threads (UI planned)

### Conversation Features
- **Prompt Templates**:
  - General Chat
  - Character Analysis
  - Plot Development
  - Scene Analysis
  - Prose Review
  - Worldbuilding
- **Context Selector**: Same as editor tools
- **Model Selection**: Per-message model choice
- **Settings Dialog**: Temperature, max tokens, top-p, frequency penalty, presence penalty
- **Collapsible Controls**: Hide/show context and settings

### Message Actions (Planned)
- Retry generation
- Copy to clipboard
- Save as snippet
- Extract data (codex entries, summaries, beats)
- Export conversation

---

## 6. CODEX (WORLDBUILDING)

### Entry Types
- **Character**: People, creatures
- **Location**: Places, settings
- **Item**: Objects, artifacts
- **Lore**: Myths, legends, history
- **Subplot**: Secondary storylines

### Entry Management
- **Create**: New entries via dialog
- **Edit**: Full-featured editor with tabs
- **Delete**: Remove entries
- **Search**: Filter by name, category, tags
- **Grid/List Views**: Visual browsing

### Entry Data
- **Details Tab**:
  - Name, aliases
  - Category
  - Description (with AI generation option)
  - Custom fields (key-value pairs)
  - Tags
  - Thumbnail image
- **Research Tab**:
  - Private notes (excluded from AI)
  - External reference links
- **Relations Tab**:
  - Link entries to each other
  - Visual relationship management
- **Mentions Tab**:
  - Scenes where entry is mentioned
  - Automatic tracking (when enabled)
- **Tracking Tab**:
  - AI context settings (always, detected, exclude, never)
  - Mention tracking toggle
  - Global entry setting

---

## 7. SNIPPETS

### Snippet Features
- **Create**: New text snippets
- **Edit**: Tiptap-based editor (same as scenes)
- **Delete**: Remove snippets
- **Pin**: Pin to sidebar for quick access
- **Search**: Filter by title
- **Inline Insert**: Insert into active scene (planned)

### Use Cases
- Frequently used descriptions
- Character dialogue patterns
- World details reference
- Template sections

---

## 8. PLAN VIEW

### View Modes
- **Grid View**: Card-based scene visualization
  - POV indicator
  - Word count
  - Status badges
  - Labels
  - Drag-and-drop reordering
- **Outline View**: Hierarchical text outline
  - Expandable acts/chapters
  - Scene summaries
  - Quick navigation
- **Matrix View**: Spreadsheet-style overview
  - Multiple column sorting
  - Bulk editing potential

### Scene Cards
- Title, subtitle, POV
- Word count, status
- Labels, summary
- Click to navigate

---

## 9. AI VENDOR MANAGEMENT

### Supported Providers
1. **OpenRouter**
   - API Endpoint: `https://openrouter.ai/api/v1`
   - Models Endpoint: `https://openrouter.ai/api/v1/models`
   - Format: `sk-or-v1-...`
   - Dynamic model fetching

2. **Google AI Studio**
   - API Endpoint: `https://generativelanguage.googleapis.com/v1beta`
   - Models Endpoint: `https://generativelanguage.googleapis.com/v1beta/models`
   - Format: `AIza...`
   - 65+ Gemini model variants (2.0, 2.5, 3.0, Flash, Pro, Thinking)

3. **Mistral AI**
   - API Endpoint: `https://api.mistral.ai/v1`
   - Models Endpoint: `https://api.mistral.ai/v1/models`
   - Models: Large, Medium, Small, Nemo

4. **OpenAI Compatible**
   - Custom endpoint support
   - Local LLMs (Ollama, LM Studio)
   - Optional API key
   - Manual model specification

5. **Moonshot AI (Kimi)**
   - API Endpoint: `https://api.moonshot.cn/v1`
   - Models Endpoint: `https://api.moonshot.cn/v1/models`
   - Models: kimi-v1-405b, kimi-v1-fast

### Connection Management
- **Add Connection**: Per-vendor API key configuration
- **Test Connection**: Validate API keys by fetching models
- **Show/Hide API Keys**: Toggle visibility
- **Enable/Disable**: Activate or deactivate connections
- **Delete Connections**: Remove vendor integrations
- **Model Refresh**: Re-fetch available models

### Model Selector
- **Grouped by Vendor**: Visual organization
- **Connection Badges**: Show which connection provides each model
- **Search/Filter**: Quick model finding
- **Last Used**: Remember last selected model
- **Fallback**: Default to saved model if available

---

## 10. SETTINGS & PREFERENCES

### Global Settings Dialog
- **Account Tab**: User profile (UI only)
- **AI Settings Tab**:
  - Manage all vendor connections
  - Test connections
  - View available models
- **General Tab**:
  - Dark/Light theme toggle
  - Export data to JSON
  - Import data from JSON
  - Clear all data

### Format Settings (Write Interface)
- **Font Family**: Selection from web font list
- **Font Size**: Adjustable
- **Line Height**: Single, 1.5, Double
- **Text Alignment**: Left, Center, Right, Justify
- **Page Width**: Adjustable in pixels

---

## 11. DATABASE ARCHITECTURE

### Dexie.js Tables
1. **projects**: Project metadata
   - id, title, author, language, genre, coverImage, seriesId, archived, createdAt, updatedAt

2. **nodes**: Manuscript tree (Acts, Chapters, Scenes)
   - id, projectId, parentId, type, title, order, expanded, content (Scene only), pov, subtitle, labels, status, summary, wordCount, beats, excludeFromAI, createdAt, updatedAt

3. **codex**: Worldbuilding entries
   - id, projectId, name, aliases, category, description, attributes, tags, references, image, thumbnail, customDetails, aiContext, trackMentions, notes, externalLinks, settings, createdAt, updatedAt

4. **series**: Series grouping
   - id, title

5. **snippets**: Reusable text snippets
   - id, projectId, title, content, pinned, createdAt, updatedAt

6. **codexRelations**: Entry relationships
   - id, parentId, childId, createdAt

7. **codexAdditions**: Scene-specific codex entries
   - id, sceneId, codexEntryId, description, position, createdAt

8. **sections**: Colored content blocks
   - id, sceneId, title, content, color, excludeFromAI, position, createdAt

9. **chatThreads**: Chat conversation threads
   - id, projectId, name, pinned, archived, defaultPrompt, defaultModel, createdAt, updatedAt

10. **chatMessages**: Individual chat messages
    - id, threadId, role, content, model, prompt, context, timestamp

### Data Operations
- **Local-First**: All data stored in browser IndexedDB
- **Offline Capable**: No server dependency
- **Export/Import**: Full project backup via Dexie export-import
- **Cascading Deletes**: Project deletion removes all related data
- **Real-time Updates**: useLiveQuery hooks for reactive UI

---

## 12. EXTERNAL API CONNECTIONS

### AI Service Integration
| Provider | Purpose | Endpoint | Auth Required |
|----------|---------|----------|---------------|
| OpenRouter | AI model aggregation | https://openrouter.ai/api/v1 | Yes (API Key) |
| Google AI | Gemini models | https://generativelanguage.googleapis.com/v1beta | Yes (API Key) |
| Mistral AI | Mistral models | https://api.mistral.ai/v1 | Yes (API Key) |
| OpenAI/Local | Custom/local models | User-defined | Optional |
| Moonshot AI | Kimi models | https://api.moonshot.cn/v1 | Yes (API Key) |

### API Call Types
1. **Model Fetching**: GET `/models` to retrieve available models
2. **Text Generation**: POST `/chat/completions` for AI responses
3. **Streaming**: SSE for real-time response streaming (Vercel AI SDK)

---

## 13. USER INTERFACE COMPONENTS

### Navigation
- **Top Navigation**: Mode switcher (Plan, Write, Chat, Review)
- **Project Navigation**: Sidebar with Manuscript/Codex/Snippets tabs
- **Story Timeline**: Vertical scene navigator (Write mode)

### Dialogs
- **Create Project**: Project creation wizard
- **Project Settings**: Metadata and danger zone
- **Create Node**: Add acts/chapters/scenes
- **Settings**: Global application settings
- **New Connection**: Add AI vendor
- **Chat Settings**: Per-thread AI parameters
- **Text Replace**: Expand/rephrase/shorten options
- **Tweak Generate**: Customize AI generation

### Menus
- **Text Selection Menu**: Bubble menu for selected text
- **Continue Writing Menu**: Popover for AI generation (Cmd+J)
- **Scene Action Menu**: Dropdown for scene operations
- **Slash Command Menu**: `/` triggered command palette
- **Editor Toolbar**: Formatting buttons
- **Format Menu**: Typography and layout settings

### Panels
- **Scene Details Panel**: POV, word count, summary, actions
- **Pinned Snippets Panel**: Quick access to pinned snippets

### Theme
- **Dark Mode**: Full dark theme support
- **Light Mode**: Default light theme
- **System**: Follow OS preference
- **Toggle**: Sun/Moon icon in settings

---

## 14. KEYBOARD SHORTCUTS & COMMANDS

### Editor Shortcuts
- `Cmd/Ctrl+J`: Open Continue Writing menu
- `Cmd/Ctrl+B`: Bold
- `Cmd/Ctrl+I`: Italic
- `Cmd/Ctrl+U`: Underline
- `/`: Slash command menu
- `@`: Mention codex entry

### Chat Shortcuts
- `Enter`: Send message
- `Shift+Enter`: New line

### Slash Commands
- `/scene-beat`: Generate scene beat
- `/continue`: Continue writing
- `/section`: Insert colored section
- `/hr`: Horizontal rule

---

## 15. IMPORT/EXPORT FEATURES

### Project Export
- **Format**: JSON (Dexie format)
- **Scope**: Full project with all related data
- **Download**: Browser download via BackupButton

### Project Import
- **Format**: JSON (Dexie format)
- **Restore**: Full project restoration
- **Merge**: Import into existing database

### Scene Export
- **Format**: Plain text (.txt)
- **Content**: Prose only (no formatting)
- **Download**: Per-scene export

### Scene Copy
- **Copy Prose**: Copy to clipboard as plain text
- **Duplicate Scene**: Clone with all data

---

## 16. VALIDATION & UX FEATURES

### API Key Validation
- Format checking per vendor
- Test connection before saving
- Error messaging

### Form Validation
- Required fields highlighted
- Inline error messages
- Disabled submit until valid

### Loading States
- Spinner/skeleton loaders during data fetch
- "Generating..." indicators during AI calls
- Disabled buttons during operations

### Confirmation Dialogs
- Archive project
- Delete project
- Delete scene
- Archive scene

---

## 17. PLANNED/PARTIAL FEATURES

### Partially Implemented
- **Rename Node**: UI exists but functionality incomplete
- **Character Detection**: Menu option exists, not implemented
- **Chat with Scene**: Menu option exists, not implemented
- **Extract Dialog**: Chat feature planned
- **Export Dialog**: Chat feature planned
- **Thread Management UI**: Sidebar for threads planned

### Database-Ready
- Chat threading (persistence complete, UI partial)
- Codex mentions tracking (data model ready, detection incomplete)
- Section AI exclusion (field exists, not utilized)

---

## TOTALS
- **72 Component Files**
- **11 Library Files**
- **10 Database Tables**
- **5 AI Vendor Integrations**
- **6 Prompt Templates**
- **15+ Keyboard Shortcuts**
- **20+ Menu Actions**
- **40+ UI Dialogs/Panels**
