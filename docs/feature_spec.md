# Feature Spec v1.0 – Source of Truth

> **From now on, I will treat this Feature Spec v1.0 as the source of truth for existing behavior and will refer back to it before suggesting changes or improvements.**

---

## 1. Feature Map Overview

### **Workspace & Project Management**
- F-01: Project Dashboard
- F-02: Create Project
- F-03: Delete Project
- F-04: Export Project (JSON)
- F-05: Import Project (JSON)
- F-06: Full Database Backup
- F-07: Full Database Restore

### **Manuscript & Navigation**
- F-08: Manuscript Tree Navigation
- F-09: Structure Management (Acts, Chapters, Scenes)
- F-10: Node Actions (Rename, Delete)

### **Editor& Writing

- F-11: Rich Text Editor (Tiptap)
- F-12: Auto-Save w/ Save Coordinator
- F-13: Word Count Tracking
- F-14: Story Timeline
- F-15: Resizable Panels

### **AI-Powered Writing Features**
- F-16: Continue Writing Menu (Scene Beat, Continue, Codex Progression)
- F-17: AI Rewrite Menu (Rephrase, Shorten, Expand, Show Don't Tell)
- F-18: Text Selection Menu (Floating toolbar on selection)
- F-19: Text Replace Dialog (Expand, Rephrase, Shorten with presets)
- F-20: Tinker Mode (Iterative text refinement)
- F-21: Format Menu
- F-22: Tweak & Generate Dialog

### **Planning & Outlining**
- F-23: Plan Views (Grid, Outline, Matrix)
- F-24: Scene Card View
- F-25: Plan Search

### **World Building (Codex)**
- F-26: Codex Management
- F-27: Entity Categorization (Character, Location, Item, Lore, Subplot)
- F-28: Entity Editor with Tabs (Details, Research, Relations, Mentions, Tracking)
- F-29: Codex Search

### **Snippets**
- F-30: Snippet Management
- F-31: Snippet Pinning
- F-32: Snippet Editor
- F-33: Snippet Search

### **AI Assistant (Chat)**
- F-34: Chat Interface
- F-35: Chat Threads
- F-36: Context Selection (Novel, Scenes, Codex, etc.)
- F-37: Prompt Selector
- F-38: Model Selector
- F-39: Chat Settings (Temperature, MaxTokens, etc.)
- F-40: Chat Thread Management (Pin, Archive, Delete, Export)
- F-41: Regenerate Response

### **Settings & Configuration**
- F-42: AI Connections Management
- F-43: Theme Toggle (Light/Dark)
- F-44: Editor Preferences (Font, Size, Line Height, Typewriter Mode)
- F-45: Project Settings Dialog

### **Infrastructure & UX**
- F-46: Toast Notifications
- F-47: Confirmation Dialogs
- F-48: Emergency Backup to localStorage
- F-49: Command Palette Search (Cmd+K)
- F-50: Multi-Tab Protection
- F-51: Crash Recovery (Error Boundaries)

### **Cloud Integration (Google Drive)**
- F-52: Connect Google Drive (OAuth 2.0)
- F-53: Backup to Google Drive
- F-54: Restore from Google Drive

---

## 2. Detailed Feature Specs

---

### Workspace & Project Management

#### F-01: Project Dashboard
- **ID:** F-01
- **Name:** Project Dashboard
- **Area/Module:** Dashboard
- **User Type:** Author
- **Description:** Landing page displaying all projects with cover images, titles, authors, and metadata.
- **Entry Points:** Root URL (`/`)
- **Preconditions:** None
- **Main Flow:**
  1. User lands on dashboard
  2. System fetches projects from Dexie DB
  3. Projects displayed as cards in grid layout
  4. Clicking a card navigates to `/project/[id]`
- **Edge Cases & Error States:**
  - No projects: Shows welcome screen with "Create Project" CTA
  - Archived projects: Display "Archived" badge
- **Data Read/Written:** Reads `projects` table
- **Dependencies:** Dexie DB, React
- **Current Limitations / Quirks:** Local storage only, no cloud sync

#### F-50: Multi-Tab Protection
- **ID:** F-50
- **Name:** Multi-Tab Protection
- **Area/Module:** Infrastructure
- **User Type:** Author
- **Description:** Prevents data corruption when the same project is opened in multiple browser tabs.
- **Entry Points:** Opening project in second tab
- **Preconditions:** Project already open in another tab
- **Main Flow:**
  1. User opens project in Tab B
  2. System detects project active in Tab A (via BroadcastChannel)
  3. Warning banner appears in Tab B
  4. User advised to close one tab
- **Edge Cases & Error States:**
  - Channel not supported: Fallback to no warning
- **Data Read/Written:** None
- **Dependencies:** BroadcastChannel API, TabCoordinator

#### F-51: Crash Recovery (Error Boundaries)
- **ID:** F-51
- **Name:** Crash Recovery
- **Area/Module:** Infrastructure
- **User Type:** Author
- **Description:** Catches unexpected app crashes, logs the error, and provides a way to reload without losing data.
- **Entry Points:** App crash
- **Preconditions:** Unhandled exception occurs
- **Main Flow:**
  1. App crashes due to error
  2. Error Boundary catches exception
  3. "Something went wrong" screen displayed
  4. Error details logged to persistent storage
  5. User clicks "Reload Application"
- **Edge Cases & Error States:**
  - Infinite crash loop: User may need to clear cache
- **Data Read/Written:** Writes error logs
- **Dependencies:** React Error Boundary, Logger
- **Current Limitations / Quirks:** Local storage only, no cloud sync

#### F-02: Create Project
- **ID:** F-02
- **Name:** Create Project
- **Area/Module:** Dashboard
- **User Type:** Author
- **Description:** Dialog to create a new novel project with metadata.
- **Entry Points:** "New Project" button on Dashboard
- **Preconditions:** None
- **Main Flow:**
  1. User clicks "New Project"
  2. Dialog opens with form (Title, Author, Description, Cover Image, Language, Series Index)
  3. User fills out and submits
  4. Project created in DB
  5. User redirected to project workspace
- **Edge Cases & Error States:**
  - Empty title: Validation error
- **Data Read/Written:** Writes to `projects` table
- **Dependencies:** Dexie DB

#### F-03: Delete Project
- **ID:** F-03
- **Name:** Delete Project
- **Area/Module:** Dashboard
- **User Type:** Author
- **Description:** Permanently deletes a project and all associated data (scenes, chapters, acts, codex, snippets).
- **Entry Points:** Dropdown menu on Project Card
- **Preconditions:** Project exists
- **Main Flow:**
  1. User clicks "Delete" in dropdown
  2. Confirmation dialog appears (destructive variant)
  3. User confirms
  4. System deletes project, all nodes, codex entries, and snippets
- **Edge Cases & Error States:**
  - User cancels: No action
- **Data Read/Written:** Deletes from `projects`, `nodes`, `codex`, `snippets` tables
- **Dependencies:** Dexie DB

#### F-04: Export Project
- **ID:** F-04
- **Name:** Export Project (JSON)
- **Area/Module:** Dashboard
- **User Type:** Author
- **Description:** Exports a single project as a JSON file.
- **Entry Points:** Dropdown menu on Project Card
- **Preconditions:** Project exists
- **Main Flow:**
  1. User clicks "Export Project"
  2. System generates JSON containing project + nodes + codex + snippets
  3. Browser downloads the file
- **Edge Cases & Error States:**
  - Large projects may take time
- **Data Read/Written:** Reads project data
- **Dependencies:** Dexie Export/Import library

#### F-05: Import Project
- **ID:** F-05
- **Name:** Import Project (JSON)
- **Area/Module:** Dashboard (Data Management Menu)
- **User Type:** Author
- **Description:** Imports a project JSON file into the database.
- **Entry Points:** "Data" menu > "Import Project JSON"
- **Preconditions:** User has valid project JSON file
- **Main Flow:**
  1. User clicks "Import Project JSON"
  2. File picker appears
  3. User selects JSON file
  4. System imports project into DB (generates new IDs if needed)
  5. Page reloads to show new project
- **Edge Cases & Error States:**
  - Invalid JSON: Error toast
- **Data Read/Written:** Writes to `projects`, `nodes`, `codex`, `snippets`
- **Dependencies:** Dexie Export/Import

#### F-06: Full Database Backup
- **ID:** F-06
- **Name:** Full Database Backup
- **Area/Module:** Dashboard (Data Management Menu)
- **User Type:** Author
- **Description:** Exports the entire database (all projects, nodes, codex, snippets) as a JSON backup.
- **Entry Points:** "Data" menu > "Backup Full Database"
- **Preconditions:** None
- **Main Flow:**
  1. User clicks "Backup Full Database"
  2. System exports entire Dexie DB to JSON
  3. Browser downloads timestamped backup file
- **Edge Cases & Error States:**
  - Large databases may take time
- **Data Read/Written:** Reads all tables
- **Dependencies:** Dexie Export/Import (`dexie-export-import`)

#### F-07: Full Database Restore
- **ID:** F-07
- **Name:** Full Database Restore
- **Area/Module:** Dashboard (Data Management Menu)
- **User Type:** Author
- **Description:** Restores database from a full backup JSON file (OVERWRITES all data).
- **Entry Points:** "Data" menu > "Restore Database"
- **Preconditions:** User has backup JSON
- **Main Flow:**
  1. User clicks "Restore Database"
  2. Destructive confirmation dialog appears
  3. User confirms and selects backup file
  4. System clears current DB and imports backup
  5. Page reloads
- **Edge Cases & Error States:**
  - Invalid backup file: Error toast
  - User cancels: No action
- **Data Read/Written:** OVERWRITES all tables
- **Dependencies:** Dexie Export/Import

#### F-52: Connect Google Drive
- **ID:** F-52
- **Name:** Connect Google Drive
- **Area/Module:** Cloud Integration
- **User Type:** Author
- **Description:** Authenticate with Google Drive to enable cloud backups.
- **Entry Points:** Settings > Cloud Backup, or "Connect Drive" button in Dashboard
- **Preconditions:** Internet connection
- **Main Flow:**
  1. User clicks "Connect Google Drive"
  2. Redirected to Google OAuth consent screen
  3. User approves access
  4. Redirected back to app
  5. Tokens stored securely in localStorage
- **Edge Cases & Error States:**
  - Auth failure: Error toast
  - User denies access: No token stored
- **Data Read/Written:** Writes tokens to `localStorage`
- **Dependencies:** `google-auth-service.ts`

#### F-53: Backup to Google Drive
- **ID:** F-53
- **Name:** Backup to Google Drive
- **Area/Module:** Cloud Integration
- **User Type:** Author
- **Description:** Upload a full database backup to a dedicated folder in Google Drive.
- **Entry Points:** Settings > Cloud Backup > "Backup Now"
- **Preconditions:** Authenticated with Google Drive
- **Main Flow:**
  1. User clicks "Backup Now"
  2. System exports DB to JSON
  3. System uploads JSON to "BecomeAnAuthor" folder in Drive
  4. Success toast appears
- **Edge Cases & Error States:**
  - Quota exceeded: Error toast
  - Network failure: Error toast
- **Data Read/Written:** Reads DB, writes to Google Drive API
- **Dependencies:** `google-drive-service.ts`

#### F-54: Restore from Google Drive
- **ID:** F-54
- **Name:** Restore from Google Drive
- **Area/Module:** Cloud Integration
- **User Type:** Author
- **Description:** Browse and restore backups from Google Drive.
- **Entry Points:** Settings > Cloud Backup > "Restore Backup"
- **Preconditions:** Authenticated with Google Drive
- **Main Flow:**
  1. User clicks "Restore Backup"
  2. List of backups fetched from Drive
  3. User selects a backup file
  4. System downloads and imports JSON (Overwrites local DB)
  5. Page reloads
- **Edge Cases & Error States:**
  - Corrupt file: Error toast
- **Data Read/Written:** Reads from Drive API, Overwrites DB
- **Dependencies:** `google-drive-service.ts`

---

### Manuscript & Navigation

#### F-08: Manuscript Tree Navigation
- **ID:** F-08
- **Name:** Manuscript Tree Navigation
- **Area/Module:** Navigation (Project Sidebar)
- **User Type:** Author
- **Description:** Hierarchical tree navigation showing Acts > Chapters > Scenes.
- **Entry Points:** Left sidebar in Project Workspace
- **Preconditions:** Project loaded
- **Main Flow:**
  1. Displays Acts as top-level nodes
  2. Acts expand to show Chapters
  3. Chapters expand to show Scenes
  4. Clicking a Scene loads it in the Editor
- **Edge Cases & Error States:**
  - Empty project: Shows "No acts yet. Click + to start."
- **Data Read/Written:** Reads `nodes` table filtered by `projectId`
- **Dependencies:** Dexie DB

#### F-09: Structure Management
- **ID:** F-09
- **Name:** Structure Management (Acts, Chapters, Scenes)
- **Area/Module:** Navigation
- **User Type:** Author
- **Description:** Creating, deleting, and organizing the manuscript hierarchy.
- **Entry Points:** "+" buttons in Sidebar, Node context menus
- **Preconditions:** Project loaded
- **Main Flow:**
  1. User clicks "+" next to an Act/Chapter
  2. `CreateNodeDialog` appears
  3. User enters node title
  4. Node created as child of parent
  5. Can delete via context menu (cascading delete)
- **Edge Cases & Error States:**
  - Deleting an Act deletes all child Chapters and Scenes
  - Deleting a Chapter deletes all child Scenes
- **Data Read/Written:** Writes to `nodes` table
- **Dependencies:** Dexie DB

#### F-10: Node Actions
- **ID:** F-10
- **Name:** Node Actions (Rename, Delete)
- **Area/Module:** Navigation
- **User Type:** Author
- **Description:** Actions available on individual nodes (Acts, Chapters, Scenes).
- **Entry Points:** `NodeActionsMenu` (three-dot menu on nodes)
- **Preconditions:** Node exists
- **Main Flow:**
  1. User clicks three-dot menu on node
  2. Options: Rename, Delete
  3. Rename: Inline editing or dialog
  4. Delete: Confirmation dialog, then recursive delete
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Updates/Deletes in `nodes` table
- **Dependencies:** Dexie DB

---

### Editor & Writing

#### F-11: Rich Text Editor
- **ID:** F-11
- **Name:** Rich Text Editor (Tiptap)
- **Area/Module:** Editor
- **User Type:** Author
- **Description:** Main writing interface built with Tiptap, supporting rich text formatting.
- **Entry Points:** Selecting a Scene in Navigation
- **Preconditions:** A Scene must be selected
- **Main Flow:**
  1. User selects a scene
  2. Editor loads content from DB
  3. User types and formats (Bold, Italic, Headings, Lists, etc.)
  4. Content auto-saved via Save Coordinator
- **Edge Cases & Error States:**
  - No scene selected: Shows "Select a scene to start writing"
- **Data Read/Written:** Reads/Writes `content` field in `nodes` table (ProseMirror JSON)
- **Dependencies:** Tiptap, Dexie DB

#### F-12: Auto-Save w/ Save Coordinator
- **ID:** F-12
- **Name:** Auto-Save with Save Coordinator
- **Area/Module:** Editor / Infrastructure
- **User Type:** Author
- **Description:** Automatic saving of editor content with race condition prevention.
- **Entry Points:** Triggered automatically on editor changes
- **Preconditions:** Scene active in editor
- **Main Flow:**
  1. Editor content changes
  2. Save Coordinator queues save operation
  3. Ensures saves are serialized per scene (no race conditions)
  4. Updates `updatedAt` timestamp
  5. On failure: Creates emergency backup in localStorage
- **Edge Cases & Error States:**
  - Save fails: Emergency backup to `localStorage`, toast error notification
- **Data Read/Written:** Writes to `nodes` table, fallback to `localStorage` (`backup_scene_{id}`)
- **Dependencies:** Save Coordinator (`save-coordinator.ts`), Dexie DB, localStorage

#### F-13: Word Count Tracking
- **ID:** F-13
- **Name:** Word Count Tracking
- **Area/Module:** Editor
- **User Type:** Author
- **Description:** Real-time word count for active scene, debounced and saved to DB.
- **Entry Points:** Displayed in editor UI
- **Preconditions:** Scene active
- **Main Flow:**
  1. As user types, word count updates in real-time
  2. Debounced (2s) before saving to DB
  3. Displayed in editor status area and Story Timeline
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Writes `wordCount` to `nodes` table
- **Dependencies:** Tiptap CharacterCount, useDebounce hook

#### F-14: Story Timeline
- **ID:** F-14
- **Name:** Story Timeline
- **Area/Module:** Editor
- **User Type:** Author
- **Description:** Visual timeline panel showing scenes, beats, and story progression.
- **Entry Points:** Right panel in Editor view
- **Preconditions:** Scene selected
- **Main Flow:**
  1. Displays vertical timeline of scenes/beats
  2. Shows word counts
  3. Updates in real-time as user writes
- **Edge Cases & Error States:**
  - Hidden when Snippet is active
- **Data Read/Written:** Reads `nodes` table
- **Dependencies:** None

#### F-15: Resizable Panels
- **ID:** F-15
- **Name:** Resizable Panels
- **Area/Module:** Editor / UI
- **User Type:** Author
- **Description:** Drag-to-resize panels (Navigation, Editor, Timeline, Pinned Snippets).
- **Entry Points:** Panel borders
- **Preconditions:** None
- **Main Flow:**
  1. User drags panel border
  2. Panels resize dynamically
  3. Min/max sizes enforced
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** None
- **Dependencies:** `react-resizable-panels`

---

### AI-Powered Writing Features

#### F-16: Continue Writing Menu
- **ID:** F-16
- **Name:** Continue Writing Menu
- **Area/Module:** Editor / AI
- **User Type:** Author
- **Description:** AI-powered menu to generate scene beats, continue writing, or suggest codex updates.
- **Entry Points:** Editor toolbar button
- **Preconditions:** AI model configured
- **Main Flow:**
  1. User clicks "Continue Writing" button
  2. Popover shows 3 modes: Scene Beat, Continue Writing, Codex Progression
  3. User selects mode and word count (200/400/600)
  4. User selects AI model
  5. User clicks "Generate" or "Tweak..." for advanced options
  6. AI generates content based on mode and context
- **Edge Cases & Error States:**
  - No model selected: Error toast
  - API failure: Error toast
- **Data Read/Written:** Reads current scene content, writes generated content
- **Dependencies:** AI Client, Model Selector, Tweak & Generate Dialog

#### F-17: AI Rewrite Menu
- **ID:** F-17
- **Name:** AI Rewrite Menu
- **Area/Module:** Editor / AI
- **User Type:** Author
- **Description:** Quick AI rewrites with presets (Rephrase, Shorten, Expand, Show Don't Tell).
- **Entry Points:** Editor toolbar button
- **Preconditions:** Text selected in editor
- **Main Flow:**
  1. User selects text
  2. User clicks "AI Rewrite" button
  3. Dropdown shows options: Rephrase, Shorten, Expand, Show Don't Tell, Tinker Mode
  4. User selects option
  5. AI rewrites selected text
  6. Rewritten text replaces selection
- **Edge Cases & Error States:**
  - No model: Error toast
  - API failure: Error toast
- **Data Read/Written:** Reads/updates editor content
- **Dependencies:** AI Client, generateText()

#### F-18: Text Selection Menu
- **ID:** F-18
- **Name:** Text Selection Menu (Floating Toolbar)
- **Area/Module:** Editor / AI
- **User Type:** Author
- **Description:** Floating toolbar that appears on text selection (4+ words) with AI actions.
- **Entry Points:** Automatically appears on text selection
- **Preconditions:** User selects 4+ words
- **Main Flow:**
  1. User selects text (4+ words)
  2. Floating menu appears above selection
  3. Shows: Expand, Rephrase, Shorten, Tweak & Generate
  4. User clicks action
  5. Opens `TextReplaceDialog`
- **Edge Cases & Error States:**
  - Selection < 4 words: Menu doesn't appear
- **Data Read/Written:** None (delegates to TextReplaceDialog)
- **Dependencies:** TextReplaceDialog

#### F-19: Text Replace Dialog
- **ID:** F-19
- **Name:** Text Replace Dialog (Expand, Rephrase, Shorten)
- **Area/Module:** Editor / AI
- **User Type:** Author
- **Description:** Full-featured dialog for AI text manipulation with presets, custom instructions, and context.
- **Entry Points:** Text Selection Menu, Rewrite Menu
- **Preconditions:** Text selected
- **Main Flow:**
  1. Dialog opens with 2 tabs: Tweak, Preview
  2. **Tweak Tab:**
     - Select preset (e.g., "Double length", "Half", "Add inner thoughts")
     - Add custom instructions
     - Select context (scenes, codex entries)
     - Choose model
     - Click "Generate"
  3. **Preview Tab:**
     - Shows before/after comparison
     - User can edit generated text
     - Click "Apply" to replace, "Regenerate", or "Discard"
- **Edge Cases & Error States:**
  - No model: Validation error
  - No custom length when required: Validation error
  - API failure: Error display in dialog
- **Data Read/Written:** Reads selection, writes replacement
- **Dependencies:** AI Client, Context Selector, Model Selector

#### F-20: Tinker Mode
- **ID:** F-20
- **Name:** Tinker Mode (Iterative Text Refinement)
- **Area/Module:** Editor / AI
- **User Type:** Author
- **Description:** Experimental mode for iterative text refinement with custom instructions.
- **Entry Points:** Rewrite Menu > "Tinker Mode..."
- **Preconditions:** Text selected
- **Main Flow:**
  1. Dialog opens with selected text in textarea
  2. User can manually edit the text
  3. User types instruction (e.g., "Make it more ominous")
  4. User clicks "Run"
  5. AI generates refinement
  6. User can iterate (edit + refine multiple times)
  7. Click "Apply Change" to insert or "Reset" to revert
- **Edge Cases & Error States:**
  - No model: Error toast
  - API failure: Error toast
- **Data Read/Written:** Reads/updates editor content
- **Dependencies:** AI Client

#### F-21: Editor Toolbar & Formatting
- **ID:** F-21
- **Name:** Editor Toolbar & Formatting
- **Area/Module:** Editor
- **User Type:** Author
- **Description:** Main toolbar containing text formatting actions (Bold, Italic, Strikethrough, Lists) and a "Format Menu" popover for typography settings (Font, Size, Line Height, Alignment, Page Width).
- **Entry Points:** Editor toolbar (top of editor)
- **Preconditions:** Editor active
- **Main Flow:**
  1. User selects text or places cursor
  2. User clicks format button (Bold, Italic, etc.) -> Applies immediately
  3. User clicks "Settings" icon -> Opens Format Menu popover for typography adjustments
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Updates editor content and `use-format-store`
- **Dependencies:** Tiptap, `use-format-store`

#### F-22: Tweak & Generate Dialog
- **ID:** F-22
- **Name:** Tweak & Generate Dialog
- **Area/Module:** Editor / AI
- **User Type:** Author
- **Description:** Advanced generation dialog with full control over word count, instructions, context, and model.
- **Entry Points:** Continue Writing Menu > "Tweak...", Text Selection Menu
- **Preconditions:** Generation mode selected
- **Main Flow:**
  1. Dialog opens with generation options
  2. User sets word count, instructions, context, model
  3. User clicks "Generate"
  4. AI generates content
  5. User can apply or discard
- **Edge Cases & Error States:**
  - Same as Text Replace Dialog
- **Data Read/Written:** Reads context, writes generated content
- **Dependencies:** AI Client, Context Selector, Model Selector

---

### Planning & Outlining

#### F-23: Plan Views
- **ID:** F-23
- **Name:** Plan Views (Grid, Outline, Matrix)
- **Area/Module:** Planning
- **User Type:** Author
- **Description:** Multiple visualization modes for story planning.
- **Entry Points:** "Plan" mode in Project Workspace
- **Preconditions:** Project loaded
- **Main Flow:**
  1. User switches to "Plan" mode
  2. Toolbar shows view switcher: Grid, Outline, Matrix
  3. **Grid View:** Cards for scenes in drag-and-drop grid
  4. **Outline View:** Linear hierarchical list
  5. **Matrix View:** Table with rows and columns
  6. User can search scenes
- **Edge Cases & Error States:**
  - No scenes: Empty state
- **Data Read/Written:** Reads `nodes` table
- **Dependencies:** Dexie DB, @dnd-kit (drag-and-drop)

#### F-24: Scene Card View
- **ID:** F-24
- **Name:** Scene Card View
- **Area/Module:** Planning (Grid View)
- **User Type:** Author
- **Description:** Card-based visualization of scenes with drag-and-drop.
- **Entry Points:** Plan > Grid View
- **Preconditions:** Scenes exist
- **Main Flow:**
  1. Scenes displayed as cards
  2. Shows scene title, summary (preview), word count, status
  3. User can drag to reorder
  4. Context menu for actions (Edit, Set POV, Delete)
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Reads `nodes`, updates `order` field
- **Dependencies:** @dnd-kit

#### F-25: Plan Search
- **ID:** F-25
- **Name:** Plan Search
- **Area/Module:** Planning
- **User Type:** Author
- **Description:** Search functionality within Plan views.
- **Entry Points:** Search bar in Plan toolbar
- **Preconditions:** Scenes exist
- **Main Flow:**
  1. User types in search bar
  2. Scenes filtered in real-time by title/content
- **Edge Cases & Error States:**
  - No matches: Shows "No scenes found"
- **Data Read/Written:** Reads `nodes` table
- **Dependencies:** None

---

### World Building (Codex)

#### F-26: Codex Management
- **ID:** F-26
- **Name:** Codex Management
- **Area/Module:** Codex
- **User Type:** Author
- **Description:** Create, edit, and organize world-building entities.
- **Entry Points:** "Codex" tab in Project Sidebar
- **Preconditions:** None
- **Main Flow:**
  1. User clicks "Codex" tab
  2. Shows list of codex entries
  3. User clicks "+" to create new entry
  4. User can click entry to edit in Entity Editor
  5. User can delete via dropdown menu
- **Edge Cases & Error States:**
  - Empty codex: Shows "No entries found"
- **Data Read/Written:** Reads/Writes `codex` table
- **Dependencies:** Dexie DB

#### F-27: Entity Categorization
- **ID:** F-27
- **Name:** Entity Categorization
- **Area/Module:** Codex
- **User Type:** Author
- **Description:** Categorizing entities into types: Character, Location, Item, Lore, Subplot.
- **Entry Points:** Entity creation/editing
- **Preconditions:** None
- **Main Flow:**
  1. User creates/edits entity
  2. User selects category from dropdown
  3. Icon and color change based on category
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** `category` field in `codex` table
- **Dependencies:** None

#### F-28: Entity Editor
- **ID:** F-28
- **Name:** Entity Editor with Tabs
- **Area/Module:** Codex
- **User Type:** Author
- **Description:** Full editor for codex entities with multiple tabs for detailed information.
- **Entry Points:** Clicking a codex entry
- **Preconditions:** Entity exists
- **Main Flow:**
  1. Entity Editor opens
  2. Shows header with name, category, thumbnail
  3. **Tabs:**
     - **Details:** Bio, description, custom fields
     - **Research:** Research notes and references
     - **Relations:** Relationships to other entities
     - **Mentions:** Where this entity is mentioned in the manuscript
     - **Tracking:** Character arcs, location changes, etc.
  4. Auto-saves with debounce (1s)
  5. User can "Save" manually or go "Back"
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Reads/Writes `codex` table
- **Dependencies:** Dexie DB, useDebounce

#### F-29: Codex Search
- **ID:** F-29
- **Name:** Codex Search
- **Area/Module:** Codex
- **User Type:** Author
- **Description:** Search codex entries by name and tags.
- **Entry Points:** Search bar in Codex tab
- **Preconditions:** Codex entries exist
- **Main Flow:**
  1. User types in search bar
  2. Entries filtered by name or tags
- **Edge Cases & Error States:**
  - No matches: Shows "No entries found"
- **Data Read/Written:** Reads `codex` table
- **Dependencies:** None

---

### Snippets

#### F-30: Snippet Management
- **ID:** F-30
- **Name:** Snippet Management
- **Area/Module:** Snippets
- **User Type:** Author
- **Description:** Create, edit, and organize reusable text snippets.
- **Entry Points:** "Snippets" tab in Project Sidebar
- **Preconditions:** None
- **Main Flow:**
  1. User clicks "Snippets" tab
  2. Shows list of snippets
  3. User clicks "New Snippet" to create
  4. User clicks snippet to edit
  5. User can delete via dropdown menu
- **Edge Cases & Error States:**
  - Empty snippets: Shows "No snippets found"
- **Data Read/Written:** Reads/Writes `snippets` table
- **Dependencies:** Dexie DB

#### F-31: Snippet Pinning
- **ID:** F-31
- **Name:** Snippet Pinning
- **Area/Module:** Snippets / Editor
- **User Type:** Author
- **Description:** Pin snippets to display in a dedicated panel in the Editor for quick reference.
- **Entry Points:** Pin button in Snippet Editor or context menu
- **Preconditions:** Snippet exists
- **Main Flow:**
  1. User pins a snippet
  2. Pinned snippet appears in right panel of Editor
  3. Shows snippet content for reference
  4. User can unpin to remove
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Updates `pinned` field in `snippets` table
- **Dependencies:** Dexie DB

#### F-32: Snippet Editor
- **ID:** F-32
- **Name:** Snippet Editor
- **Area/Module:** Snippets
- **User Type:** Author
- **Description:** Rich text editor for snippet content.
- **Entry Points:** Clicking a snippet
- **Preconditions:** Snippet exists
- **Main Flow:**
  1. Snippet Editor opens in main editor area
  2. User edits title and content (Tiptap)
  3. Auto-saves
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Reads/Writes `snippets` table
- **Dependencies:** Tiptap, Dexie DB

#### F-33: Snippet Search
- **ID:** F-33
- **Name:** Snippet Search
- **Area/Module:** Snippets
- **User Type:** Author
- **Description:** Search snippets by title.
- **Entry Points:** Search bar in Snippets tab
- **Preconditions:** Snippets exist
- **Main Flow:**
  1. User types in search bar
  2. Snippets filtered by title
- **Edge Cases & Error States:**
  - No matches: Shows "No snippets found"
- **Data Read/Written:** Reads `snippets` table
- **Dependencies:** None

---

### AI Assistant (Chat)

#### F-34: Chat Interface
- **ID:** F-34
- **Name:** Chat Interface
- **Area/Module:** Chat
- **User Type:** Author
- **Description:** AI chat interface for brainstorming, questions, and writing assistance.
- **Entry Points:** "Chat" mode in Project Workspace
- **Preconditions:** AI model configured
- **Main Flow:**
  1. User switches to "Chat" mode
  2. Shows chat threads list and active thread
  3. User types message and clicks send
  4. AI responds (streaming)
  5. Messages stored in DB
- **Edge Cases & Error States:**
  - No model selected: Error toast
  - API failure: Error message in chat
- **Data Read/Written:** Reads/Writes `chat_threads` and `chat_messages` tables
- **Dependencies:** AI Client, Dexie DB

#### F-35: Chat Threads
- **ID:** F-35
- **Name:** Chat Threads
- **Area/Module:** Chat
- **User Type:** Author
- **Description:** Manage multiple conversation threads with AI.
- **Entry Points:** Chat sidebar
- **Preconditions:** None
- **Main Flow:**
  1. User can create new thread
  2. User can switch between threads
  3. Each thread has independent conversation history
  4. User can rename, pin, archive, delete, or export threads
- **Edge Cases & Error States:**
  - No threads: Shows prompt to create first thread
- **Data Read/Written:** Reads/Writes `chat_threads` table
- **Dependencies:** Dexie DB

#### F-36: Context Selection
- **ID:** F-36
- **Name:** Context Selection (Novel, Scenes, Codex)
- **Area/Module:** Chat
- **User Type:** Author
- **Description:** Select specific project data to include in AI chat context.
- **Entry Points:** "Add Context" button in Chat
- **Preconditions:** Project has data
- **Main Flow:**
  1. User clicks "Add Context"
  2. Dropdown menu shows:
     - Full Novel Text
     - Full Outline
     - Individual Acts/Chapters/Scenes
     - Codex Entries (by category)
  3. User selects items
  4. Selected contexts displayed as chips
  5. Context included in AI prompt
- **Edge Cases & Error States:**
  - Context too large: May hit token limits (not explicitly handled)
- **Data Read/Written:** Reads `nodes` and `codex` tables
- **Dependencies:** Dexie DB

#### F-37: Prompt Selector
- **ID:** F-37
- **Name:** Prompt Selector
- **Area/Module:** Chat
- **User Type:** Author
- **Description:** Select predefined system prompts for different use cases.
- **Entry Points:** Chat controls
- **Preconditions:** None
- **Main Flow:**
  1. User selects prompt from dropdown
  2. System prompt changes for AI
  3. Examples: "General", "Brainstorming", "Character Development", etc.
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Reads prompt templates (likely from constants/config)
- **Dependencies:** None

#### F-38: Model Selector
- **ID:** F-38
- **Name:** Model Selector
- **Area/Module:** Chat / AI
- **User Type:** Author
- **Description:** Select which AI model to use for generation.
- **Entry Points:** Chat controls, AI feature dialogs
- **Preconditions:** AI connections configured
- **Main Flow:**
  1. User opens model dropdown
  2. Shows available models from enabled AI connections
  3. User selects model
  4. Model used for subsequent generations
  5. Last used model saved to localStorage
- **Edge Cases & Error States:**
  - No models available: Shows placeholder or error
- **Data Read/Written:** Reads AI connections from localStorage, writes last used model
- **Dependencies:** localStorage

#### F-39: Chat Settings
- **ID:** F-39
- **Name:** Chat Settings (Temperature, MaxTokens, etc.)
- **Area/Module:** Chat
- **User Type:** Author (Power User)
- **Description:** Advanced settings for AI generation parameters.
- **Entry Points:** Settings icon in Chat header
- **Preconditions:** None
- **Main Flow:**
  1. User clicks settings icon
  2. Dialog shows sliders for:
     - Temperature (0-2)
     - Max Tokens (100-4000)
     - Top P (0-1)
     - Frequency Penalty (0-2)
     - Presence Penalty (0-2)
  3. User adjusts and closes
  4. Settings applied to future generations
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Stored in component state (ephemeral)
- **Dependencies:** None

#### F-40: Chat Thread Management
- **ID:** F-40
- **Name:** Chat Thread Management (Pin, Archive, Delete, Export)
- **Area/Module:** Chat
- **User Type:** Author
- **Description:** Actions to manage chat threads.
- **Entry Points:** Thread header dropdown
- **Preconditions:** Thread exists
- **Main Flow:**
  1. **Pin:** Keeps thread at top of list
  2. **Archive:** Hides thread from main view
  3. **Delete:** Removes thread and all messages (with confirmation)
  4. **Export:** Downloads thread as Markdown file
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Updates `chat_threads` table, deletes `chat_messages`
- **Dependencies:** Dexie DB

#### F-41: Regenerate Response
- **ID:** F-41
- **Name:** Regenerate Response
- **Area/Module:** Chat
- **User Type:** Author
- **Description:** Regenerate AI response from a specific point in conversation.
- **Entry Points:** Message context menu
- **Preconditions:** Message exists
- **Main Flow:**
  1. User clicks "Regenerate from here" on a message
  2. System deletes all messages after that point
  3. Finds last user message before deleted section
  4. Regenerates AI response using same prompt and settings
- **Edge Cases & Error States:**
  - API failure: Error toast
- **Data Read/Written:** Deletes/Creates in `chat_messages` table
- **Dependencies:** AI Client, Dexie DB

---

### Settings & Configuration

#### F-42: AI Connections Management
- **ID:** F-42
- **Name:** AI Connections Management
- **Area/Module:** Settings
- **User Type:** Author
- **Description:** Configure API connections to AI providers.
- **Entry Points:** Settings > AI Connections tab
- **Preconditions:** None
- **Main Flow:**
  1. User opens Settings dialog
  2. Clicks "AI Connections" tab
  3. Shows list of configured connections
  4. User can add/edit/delete connections
  5. **New Connection Dialog:**
     - Provider: **OpenRouter**, **Google AI Studio**, **Mistral AI**, **OpenAI Compatible** (Ollama, LM Studio), **Moonshot AI (Kimi)**
     - API Key
     - Base URL (optional for some providers)
     - Available models (fetched automatically where supported)
     - Enable/disable toggle
  6. Connections saved to localStorage
- **Edge Cases & Error States:**
  - Invalid API key: Validation error (not tested until use)
- **Data Read/Written:** Reads/Writes `ai_connections` in localStorage
- **Dependencies:** localStorage

**Supported AI Providers:**
1. **OpenRouter** - API aggregator with multiple models
2. **Google AI Studio** - Gemini models (2.0, 2.5, 3.0, Flash, Pro, Thinking variants)
3. **Mistral AI** - Mistral Large, Medium, Small, Nemo
4. **OpenAI Compatible** - Custom endpoints for local LLMs (Ollama, LM Studio, etc.)
5. **Moonshot AI (Kimi)** - kimi-v1-405b, kimi-v1-fast

#### F-43: Theme Toggle
- **ID:** F-43
- **Name:** Theme Toggle (Light/Dark)
- **Area/Module:** Settings / UI
- **User Type:** Author
- **Description:** Switch between light and dark themes.
- **Entry Points:** Settings sidebar (bottom), main Settings dialog
- **Preconditions:** None
- **Main Flow:**
  1. User clicks Light or Dark button
  2. Theme changes immediately
  3. Preference saved
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Managed by `next-themes`
- **Dependencies:** next-themes

#### F-44: Editor Preferences
- **ID:** F-44
- **Name:** Editor Preferences (Font, Size, Line Height, Typewriter Mode)
- **Area/Module:** Settings (General Settings tab)
- **User Type:** Author
- **Description:** Customize editor appearance and behavior. Shares state with "Format Menu" (F-21).
- **Entry Points:** Settings > General Settings
- **Preconditions:** None
- **Main Flow:**
  1. User opens General Settings tab
  2. **Appearance:**
     - Font Family: Georgia, Merriweather, Inter, Arial, Courier Prime
     - Font Size: 12-24px (slider)
     - Line Height: 1.0-2.5 (slider)
  3. **Editor Experience:**
     - Typewriter Mode: Toggle (keeps cursor centered)
  4. **Interface:**
     - Show Line Numbers: Toggle
     - Show Word Count: Toggle
  5. Settings saved to Zustand store (persistent)
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Zustand `use-format-store`
- **Dependencies:** Zustand

#### F-45: Project Settings Dialog
- **ID:** F-45
- **Name:** Project Settings Dialog
- **Area/Module:** Project
- **User Type:** Author
- **Description:** Edit project metadata (title, author, description, cover, etc.).
- **Entry Points:** Gear icon in Project Sidebar header
- **Preconditions:** Project loaded
- **Main Flow:**
  1. User clicks gear icon
  2. Dialog opens with project metadata form
  3. User edits fields
  4. User saves
  5. Project updated in DB
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** Updates `projects` table
- **Dependencies:** Dexie DB

---

### Infrastructure & UX

#### F-46: Toast Notifications
- **ID:** F-46
- **Name:** Toast Notifications
- **Area/Module:** Infrastructure
- **User Type:** Author
- **Description:** Lightweight notifications for success, error, info messages.
- **Entry Points:** Triggered by system events (save success, errors, etc.)
- **Preconditions:** None
- **Main Flow:**
  1. System event occurs (e.g., save success, error)
  2. Toast appears in corner
  3. Auto-dismisses after timeout
  4. User can manually dismiss
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** None
- **Dependencies:** Sonner (toast library)

#### F-47: Confirmation Dialogs
- **ID:** F-47
- **Name:** Confirmation Dialogs
- **Area/Module:** Infrastructure
- **User Type:** Author
- **Description:** Reusable confirmation dialogs for destructive actions.
- **Entry Points:** Used by delete, restore, and other destructive actions
- **Preconditions:** None
- **Main Flow:**
  1. User initiates destructive action
  2. Confirmation dialog appears
  3. Shows title, description, and action buttons
  4. User confirms or cancels
  5. Returns promise resolving to boolean
- **Edge Cases & Error States:**
  - None
- **Data Read/Written:** None
- **Dependencies:** `use-confirmation` hook

#### F-48: Emergency Backup to localStorage
- **ID:** F-48
- **Name:** Emergency Backup to localStorage
- **Area/Module:** Infrastructure (Save Coordinator)
- **User Type:** Author (Automatic)
- **Description:** Automatic backup to localStorage if database save fails.
- **Entry Points:** Triggered automatically on save failure
- **Preconditions:** Save to Dexie DB fails
- **Main Flow:**
  1. Save operation fails
  2. Save Coordinator catches error
  3. Content backed up to localStorage with key `backup_scene_{sceneId}`
  4. Error toast shown to user
- **Edge Cases & Error States:**
  - localStorage full: Backup fails silently (logged)
- **Data Read/Written:** Writes to localStorage
- **Dependencies:** localStorage

---

## 3. Declaration

**Feature Spec v1.0 – Source of Truth**

I confirm that this document represents the **complete and comprehensive** state of all application features as discovered in the codebase. I will use this as the authoritative reference for all future development, feature evaluation, and architectural decisions.

**Total Features Documented: 48**

This specification covers:
- ✅ Project & data management
- ✅ Manuscript structure & navigation
- ✅ Editor & writing tools
- ✅ AI-powered features (7 distinct features)
- ✅ Planning & outlining
- ✅ Codex (world-building)
- ✅ Snippets
- ✅ Chat & AI assistant
- ✅ Settings & configuration
- ✅ Infrastructure & UX systems
