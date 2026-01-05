# User Acceptance Test Cases

> **Document**: Comprehensive UAT for Become An Author  
> **Version**: 1.1  
> **Date**: January 5, 2026  
> **Total Test Cases**: 300+

---

## Test Case Format

| Field | Description |
|-------|-------------|
| **ID** | Unique identifier (e.g., PRJ-001) |
| **Category** | Feature area |
| **Test Case** | What to test |
| **Steps** | Step-by-step instructions |
| **Expected Result** | What should happen |
| **Priority** | P1 (Critical), P2 (High), P3 (Medium) |

---

# 1. PROJECT MANAGEMENT

## 1.1 Project List & Dashboard

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PRJ-001 | View empty project list | 1. Launch app with no projects | Empty state message displays with "Create Project" button | P1 |
| PRJ-002 | View project list with projects | 1. Launch app with existing projects | All projects display as cards with title, author, word count | P1 |
| PRJ-003 | Project card shows metadata | 1. View project card | Shows: title, author, word count, last modified date | P2 |
| PRJ-004 | Click project opens it | 1. Click on a project card | Navigates to project editor view | P1 |


## 1.2 Create Project

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PRJ-010 | Open create project dialog | 1. Click "New Novel" button | Create project dialog opens | P1 |
| PRJ-011 | **Series required** | 1. Enter title 2. Skip series selection 3. Click Create | **Button disabled, error shown** | P1 |
| PRJ-012 | Select existing series | 1. Open dialog 2. Select series from dropdown | Series selected, book number field enabled | P1 |
| PRJ-013 | Create new series inline | 1. Click "Create New Series" 2. Enter name 3. Click Create | New series created and selected | P1 |
| PRJ-014 | Create project with all fields | 1. Select series 2. Enter book number 3. Enter title 4. Select location 5. Click Create | Project created with seriesId, navigates to editor | P1 |
| PRJ-015 | Create project creates folder structure | 1. Create new project 2. Check filesystem | Creates .meta/, manuscript/, codex/, snippets/, analyses/, exports/ | P1 |
| PRJ-016 | Create project seeds templates | 1. Create new project 2. Check codex templates | Default templates created (Character, Location, Item) | P2 |
| PRJ-017 | Create project with custom path | 1. Click folder picker 2. Select custom directory 3. Create project | Project created in selected directory | P2 |
| PRJ-018 | Duplicate project title check | 1. Create project "Test" 2. Create another "Test" in same location | Error message about duplicate | P2 |
| PRJ-019 | Project title with special chars | 1. Create project with title "Test/Project" | Error or sanitized title | P3 |
| PRJ-020 | Book number defaults to "Book 1" | 1. Open dialog | Book number field pre-filled with "Book 1" | P2 |
| PRJ-021 | Book number custom value | 1. Change to "Prequel" or "Book 3" | Custom value saved in project.json | P2 |

## 1.3 Edit Project

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PRJ-020 | Open project settings | 1. Open project 2. Click settings gear icon | Project settings dialog opens | P1 |
| PRJ-021 | Edit project title | 1. Open settings 2. Change title 3. Save | Title updated in UI and project.json | P1 |
| PRJ-022 | Edit project author | 1. Open settings 2. Change author 3. Save | Author updated | P2 |
| PRJ-023 | Edit project description | 1. Open settings 2. Add description 3. Save | Description saved | P3 |
| PRJ-024 | Cancel edit reverts changes | 1. Edit title 2. Click Cancel | Original values restored | P2 |

## 1.4 Delete Project

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PRJ-030 | Delete project shows confirmation | 1. Click delete on project | Confirmation dialog appears | P1 |
| PRJ-031 | Confirm delete removes project | 1. Click delete 2. Confirm | Project removed from list, moved to Trash folder | P1 |
| PRJ-032 | Cancel delete keeps project | 1. Click delete 2. Cancel | Project remains | P1 |
| PRJ-033 | Delete project with content | 1. Create scenes/codex 2. Delete project | All content deleted | P2 |

## 1.5 Archive Project

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PRJ-040 | Archive project | 1. Click archive on project | Project marked as archived | P2 |
| PRJ-041 | Archived projects hidden by default | 1. Archive project 2. View list | Archived project not visible | P2 |
| PRJ-042 | Show archived projects toggle | 1. Toggle "Show Archived" | Archived projects appear grayed out | P3 |
| PRJ-043 | Unarchive project | 1. Show archived 2. Click unarchive | Project restored to active | P2 |

---

# 2. MANUSCRIPT STRUCTURE

## 2.1 View Structure

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| STR-001 | View empty structure | 1. Open new project | Empty outline with "Add Act" prompt | P1 |
| STR-002 | View hierarchical structure | 1. Open project with Acts/Chapters/Scenes | Tree view shows correct hierarchy | P1 |
| STR-003 | Expand/collapse nodes | 1. Click expand arrow on Act | Children show/hide | P1 |
| STR-004 | Select scene in tree | 1. Click on scene in tree | Scene loads in editor, highlighted in tree | P1 |
| STR-005 | Scene shows word count | 1. View scene node | Word count badge visible | P2 |
| STR-006 | Scene shows status | 1. View scene node | Status indicator (draft/revised/final) | P2 |

## 2.2 Create Nodes

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| STR-010 | Create Act | 1. Click "Add Act" or context menu 2. Enter title 3. Confirm | New Act appears at root level | P1 |
| STR-011 | Create Chapter under Act | 1. Right-click Act 2. Select "Add Chapter" 3. Enter title | Chapter appears as child of Act | P1 |
| STR-012 | Create Scene under Chapter | 1. Right-click Chapter 2. Select "Add Scene" 3. Enter title | Scene appears, markdown file created | P1 |
| STR-013 | Create Scene at root level | 1. Create scene without parent | Scene appears at root | P2 |
| STR-014 | Default scene content | 1. Create new scene | Scene has YAML frontmatter with ID, title, order, status | P1 |
| STR-015 | Node order set correctly | 1. Create multiple scenes in chapter | Order numbers sequential (0, 1, 2...) | P2 |

## 2.3 Rename Nodes

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| STR-020 | Rename Act | 1. Right-click Act 2. Select Rename 3. Enter new name 4. Confirm | Act title updated | P1 |
| STR-021 | Rename Chapter | 1. Double-click Chapter title 2. Edit 3. Press Enter | Chapter title updated | P1 |
| STR-022 | Rename Scene | 1. Rename scene 2. Check editor header | Scene title updated in tree and editor | P1 |
| STR-023 | Cancel rename | 1. Start renaming 2. Press Escape | Original name retained | P2 |
| STR-024 | Rename to empty string | 1. Try to rename to "" | Error or blocked | P2 |

## 2.4 Delete Nodes

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| STR-030 | Delete Scene | 1. Right-click scene 2. Delete 3. Confirm | Scene removed from tree, file deleted | P1 |
| STR-031 | Delete Chapter with scenes | 1. Delete chapter with children | All child scenes deleted | P1 |
| STR-032 | Delete Act with structure | 1. Delete act with chapters/scenes | Entire subtree deleted | P1 |
| STR-033 | Delete shows confirmation | 1. Click delete | Shows what will be deleted | P1 |
| STR-034 | Undo delete (if supported) | 1. Delete scene 2. Undo | Scene restored | P3 |

## 2.5 Reorder Nodes

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| STR-040 | Drag scene within chapter | 1. Drag scene up/down | Order changes, persisted | P1 |
| STR-041 | Drag scene to different chapter | 1. Drag scene to another chapter | Scene moves, parent changes | P2 |
| STR-042 | Drag chapter within act | 1. Reorder chapters | Order updated | P2 |
| STR-043 | Drag act to reorder | 1. Drag act up/down | Acts reordered | P2 |
| STR-044 | Invalid drag operation blocked | 1. Try to drag act into chapter | Operation blocked or shows error | P3 |

---

# 3. SCENE EDITOR

## 3.1 Load & Display

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EDT-001 | Load scene content | 1. Click on scene | Scene content loads in editor | P1 |
| EDT-002 | Display scene title | 1. Load scene | Title shows in editor header | P1 |
| EDT-003 | Display word count | 1. Load scene | Word count shows in footer/header | P1 |
| EDT-004 | Display character count | 1. Load scene | Character count available | P2 |
| EDT-005 | Load scene with formatting | 1. Load scene with bold/italic | Formatting preserved | P1 |
| EDT-006 | Load scene with headings | 1. Load scene with H1/H2/H3 | Headings display correctly | P1 |
| EDT-007 | Empty scene shows placeholder | 1. Load empty scene | Placeholder text visible | P2 |

## 3.2 Text Editing

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EDT-010 | Type text | 1. Click in editor 2. Type | Text appears | P1 |
| EDT-011 | Delete text | 1. Select text 2. Press Delete/Backspace | Text removed | P1 |
| EDT-012 | Cut text | 1. Select 2. Cmd+X | Text cut to clipboard | P1 |
| EDT-013 | Copy text | 1. Select 2. Cmd+C | Text copied | P1 |
| EDT-014 | Paste text | 1. Cmd+V | Text pasted | P1 |
| EDT-015 | Undo action | 1. Make change 2. Cmd+Z | Change undone | P1 |
| EDT-016 | Redo action | 1. Undo 2. Cmd+Shift+Z | Change redone | P1 |
| EDT-017 | Select all | 1. Cmd+A | All text selected | P2 |

## 3.3 Text Formatting

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EDT-020 | Apply bold | 1. Select text 2. Click Bold or Cmd+B | Text becomes bold | P1 |
| EDT-021 | Apply italic | 1. Select text 2. Click Italic or Cmd+I | Text becomes italic | P1 |
| EDT-022 | Apply heading 1 | 1. Select text 2. Select H1 | Text becomes H1 | P1 |
| EDT-023 | Apply heading 2 | 1. Select text 2. Select H2 | Text becomes H2 | P1 |
| EDT-024 | Apply heading 3 | 1. Select text 2. Select H3 | Text becomes H3 | P1 |
| EDT-025 | Create bullet list | 1. Click bullet list button | Bullet list created | P1 |
| EDT-026 | Create numbered list | 1. Click numbered list button | Numbered list created | P1 |
| EDT-027 | Create blockquote | 1. Click blockquote button | Blockquote created | P2 |
| EDT-028 | Remove formatting | 1. Select formatted text 2. Click same format | Format removed | P2 |
| EDT-029 | Multiple formatting | 1. Apply bold 2. Apply italic | Text is bold AND italic | P2 |

## 3.4 Format Menu (Bubble Menu)

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EDT-030 | Selection shows bubble menu | 1. Select text | Format menu appears above selection | P1 |
| EDT-031 | Apply format from bubble | 1. Select text 2. Click Bold in bubble | Format applied | P1 |
| EDT-032 | Bubble menu disappears on click away | 1. Select 2. Click elsewhere | Menu disappears | P2 |
| EDT-033 | Bubble menu shows current formats | 1. Select bold text | Bold button appears active/highlighted | P2 |

## 3.5 Auto-Save

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EDT-040 | Auto-save after typing | 1. Type text 2. Wait 1-2 seconds | "Saved" indicator appears | P1 |
| EDT-041 | Auto-save persists content | 1. Edit 2. Wait for save 3. Reload app | Content preserved | P1 |
| EDT-042 | Save indicator shows saving | 1. Type | "Saving..." indicator visible | P2 |
| EDT-043 | Save indicator shows saved | 1. Wait after edit | "Saved" indicator | P2 |
| EDT-044 | Rapid typing coalesces saves | 1. Type continuously | Not saving on every keystroke | P2 |

## 3.6 Emergency Backup

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EDT-050 | Recovery prompt on crash | 1. Force close app 2. Reopen | Recovery dialog if unsaved changes | P1 |
| EDT-051 | Restore from backup | 1. See recovery prompt 2. Click Restore | Content restored | P1 |
| EDT-052 | Dismiss backup | 1. See recovery prompt 2. Click Discard | Backup deleted, normal load | P2 |
| EDT-053 | Backup auto-cleanup | 1. Wait 24+ hours | Old backups cleaned up | P3 |

## 3.7 Find & Replace

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EDT-060 | Open find dialog | 1. Cmd+F or click Find | Find dialog opens | P1 |
| EDT-061 | Find text | 1. Enter search term | Matches highlighted | P1 |
| EDT-062 | Next match | 1. Find 2. Click Next | Cursor moves to next match | P1 |
| EDT-063 | Previous match | 1. Click Previous | Cursor moves to previous match | P1 |
| EDT-064 | Replace single | 1. Find 2. Enter replacement 3. Click Replace | Single match replaced | P1 |
| EDT-065 | Replace all | 1. Click Replace All | All matches replaced | P1 |
| EDT-066 | Case sensitive search | 1. Toggle case sensitive | Only exact case matches | P2 |
| EDT-067 | No matches found | 1. Search for non-existent text | "No matches" message | P2 |
| EDT-068 | Match count | 1. Search | Shows "X of Y matches" | P2 |

## 3.8 Focus Mode

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EDT-070 | Enter focus mode | 1. Click Focus Mode toggle | Sidebar hides, editor full width | P2 |
| EDT-071 | Exit focus mode | 1. Click toggle again | Normal layout restored | P2 |
| EDT-072 | Focus mode persists editing | 1. Edit in focus mode | Changes saved normally | P2 |
| EDT-073 | Keyboard shortcut for focus | 1. Press shortcut (if exists) | Focus mode toggles | P3 |

---

# 4. MENTIONS SYSTEM

## 4.1 @Mention Insertion

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| MNT-001 | Trigger mention with @ | 1. Type @ | Mention autocomplete appears | P1 |
| MNT-002 | Filter mentions by typing | 1. Type @Joh | List filters to matching entries | P1 |
| MNT-003 | Select mention with click | 1. Type @ 2. Click on entry | Mention inserted | P1 |
| MNT-004 | Select mention with Enter | 1. Type @ 2. Arrow to entry 3. Enter | Mention inserted | P1 |
| MNT-005 | Mention shows entry name | 1. Insert mention | Shows entry name styled differently | P1 |
| MNT-006 | Cancel mention with Escape | 1. Type @ 2. Press Escape | Dropdown closes, @ remains | P2 |
| MNT-007 | Empty mention list message | 1. Type @ in empty codex | "No entries" message | P2 |
| MNT-008 | Mention persists on save | 1. Insert mention 2. Save 3. Reload | Mention preserved | P1 |

## 4.2 Mention Navigation

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| MNT-010 | Click mention opens codex | 1. Click on mention | Codex entry opens | P2 |
| MNT-011 | Hover shows tooltip | 1. Hover over mention | Entry preview tooltip | P3 |

---

# 5. AI WRITING ASSISTANCE

## 5.1 Continue Writing

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AI-001 | Continue writing button visible | 1. Position cursor at end of text | Continue writing option available | P1 |
| AI-002 | Generate continuation | 1. Click Continue Writing | AI generates text continuation | P1 |
| AI-003 | Streaming response | 1. Start generation | Text appears progressively | P1 |
| AI-004 | Accept generation | 1. Generate 2. Click Accept | Generated text inserted | P1 |
| AI-005 | Reject generation | 1. Generate 2. Click Reject | Generated text discarded | P1 |
| AI-006 | Cancel generation | 1. Start generating 2. Click Cancel | Generation stops | P1 |
| AI-007 | Regenerate | 1. Generate 2. Click Regenerate | New generation replaces old | P2 |
| AI-008 | Custom prompt for continue | 1. Enter custom instructions | AI follows instructions | P2 |

## 5.2 Rewrite Selection

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AI-010 | Rewrite button visible | 1. Select text | Rewrite option in menu | P1 |
| AI-011 | Rewrite selected text | 1. Select 2. Click Rewrite | AI rewrites selection | P1 |
| AI-012 | Rewrite preview | 1. Rewrite | Shows original vs. rewrite | P1 |
| AI-013 | Accept rewrite | 1. Click Accept | Selection replaced with rewrite | P1 |
| AI-014 | Reject rewrite | 1. Click Reject | Original text preserved | P1 |
| AI-015 | Rewrite with style options | 1. Select style (more formal, simpler, etc.) | Rewrite reflects style | P2 |

## 5.3 AI Context

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| AI-020 | Context includes scene | 1. Generate in scene | AI knows current scene context | P1 |
| AI-021 | Context includes codex | 1. Mention character 2. Generate | AI knows character details | P2 |
| AI-022 | Context respects excludeFromAI | 1. Mark scene as excludeFromAI 2. Generate in other scene | Excluded scene not in context | P2 |

---

# 6. CODEX (WORLD-BUILDING)

## 6.1 View Codex

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CDX-001 | Open codex panel | 1. Click Codex tab | Codex panel opens | P1 |
| CDX-002 | View category tabs | 1. Open codex | See tabs: Characters, Locations, Items, Lore, Subplots | P1 |
| CDX-003 | View entries in category | 1. Click Characters tab | Character entries listed | P1 |
| CDX-004 | Empty category message | 1. View empty category | "No entries" message with create button | P2 |
| CDX-005 | Search codex | 1. Type in search | Entries filtered by name | P2 |
| CDX-006 | Filter by tag | 1. Select tag filter | Only tagged entries shown | P3 |

## 6.2 Create Entry

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CDX-010 | Open create entry dialog | 1. Click "Add Character" | Create dialog opens | P1 |
| CDX-011 | Create entry with name only | 1. Enter name 2. Save | Entry created with default fields | P1 |
| CDX-012 | Create entry with all fields | 1. Fill all fields 2. Save | All fields saved | P1 |
| CDX-013 | Select template on create | 1. Select "Basic Character" template | Template fields pre-populated | P2 |
| CDX-014 | Create entry creates file | 1. Create entry | JSON file created in codex/ directory | P1 |
| CDX-015 | Duplicate name warning | 1. Create entry with existing name | Warning or error | P3 |

## 6.3 Edit Entry

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CDX-020 | Open entry for editing | 1. Click on entry | Entry editor opens | P1 |
| CDX-021 | Edit entry name | 1. Change name 2. Save | Name updated | P1 |
| CDX-022 | Edit entry description | 1. Edit description 2. Save | Description saved | P1 |
| CDX-023 | Add custom field | 1. Add field 2. Enter value | Custom field saved | P2 |
| CDX-024 | Remove custom field | 1. Delete field | Field removed | P2 |
| CDX-025 | Edit uses rich text | 1. Format text in description | Formatting preserved | P2 |
| CDX-026 | Entry auto-saves | 1. Edit 2. Wait | Entry saved automatically | P2 |

## 6.4 Delete Entry

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CDX-030 | Delete entry shows confirmation | 1. Click delete | Confirmation dialog | P1 |
| CDX-031 | Confirm delete removes entry | 1. Confirm delete | Entry removed from list and file deleted | P1 |
| CDX-032 | Delete entry removes mentions | 1. Delete entry with mentions | Mentions become plain text or marked broken | P2 |
| CDX-033 | Delete entry to trash | 1. Delete | Entry moved to trash (if soft delete) | P2 |

## 6.5 Entry Relations

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CDX-040 | View relations tab | 1. Open entry 2. Click Relations tab | Relations list visible | P1 |
| CDX-041 | Add relation | 1. Click Add Relation 2. Select target 3. Select type | Relation created | P1 |
| CDX-042 | View relation types | 1. Open relation dropdown | See: Friend, Enemy, Family, etc. | P2 |
| CDX-043 | Remove relation | 1. Click remove on relation | Relation deleted | P2 |
| CDX-044 | Bidirectional relation | 1. Add relation A→B | Relation visible from both A and B | P2 |
| CDX-045 | Custom relation type | 1. Create custom relation type 2. Use it | Custom type works | P3 |

## 6.6 Entry Tags

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CDX-050 | Add tag to entry | 1. Click Add Tag 2. Select/create tag | Tag added to entry | P2 |
| CDX-051 | Remove tag from entry | 1. Click X on tag | Tag removed | P2 |
| CDX-052 | Create new tag | 1. Type new tag name | New tag created with color | P2 |
| CDX-053 | Tag colors | 1. Create tag | Tag has assigned color | P3 |
| CDX-054 | Filter by tag | 1. Click tag in filter | Only tagged entries shown | P2 |

## 6.7 Mentions Tracking

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CDX-060 | View mentions tab | 1. Open entry 2. Click Mentions | Shows scenes where entry is mentioned | P2 |
| CDX-061 | Click mention goes to scene | 1. Click on mention | Scene opens with mention highlighted | P2 |
| CDX-062 | Mention count | 1. View entry | Shows mention count badge | P3 |

---

# 7. CHAT / AI ASSISTANT

## 7.1 Chat Threads

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CHT-001 | Open chat panel | 1. Click Chat tab | Chat panel opens | P1 |
| CHT-002 | View thread list | 1. Open chat | List of chat threads visible | P1 |
| CHT-003 | Create new thread | 1. Click New Chat | New thread created | P1 |
| CHT-004 | Rename thread | 1. Click rename 2. Enter name | Thread renamed | P2 |
| CHT-005 | Delete thread | 1. Click delete 2. Confirm | Thread and messages deleted | P1 |
| CHT-006 | Select thread | 1. Click on thread | Thread messages load | P1 |

## 7.2 Messaging

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CHT-010 | Send message | 1. Type in input 2. Click Send or Enter | Message sent, appears in thread | P1 |
| CHT-011 | AI responds | 1. Send message | AI response appears | P1 |
| CHT-012 | Streaming response | 1. Send | Response streams in real-time | P1 |
| CHT-013 | Stop generation | 1. Click Stop while generating | Generation stops | P1 |
| CHT-014 | Delete message | 1. Hover message 2. Click delete | Message removed | P2 |
| CHT-015 | Copy message | 1. Click copy | Message copied to clipboard | P2 |
| CHT-016 | Message timestamps | 1. View messages | Timestamps visible | P3 |
| CHT-017 | Long messages scroll | 1. View long AI response | Proper scrolling | P2 |

## 7.3 Chat Context

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CHT-020 | Include current scene | 1. Enable "Include current scene" 2. Send | AI knows scene context | P2 |
| CHT-021 | Include manuscript | 1. Enable "Include full manuscript" | AI has full story context | P2 |
| CHT-022 | Include codex | 1. Enable codex context | AI knows world-building | P2 |
| CHT-023 | Context token count | 1. View context settings | Shows token count | P3 |

## 7.4 Model Selection

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CHT-030 | Select model | 1. Click model selector 2. Choose model | Model selected | P1 |
| CHT-031 | Model persists | 1. Select model 2. Close/reopen | Same model selected | P2 |
| CHT-032 | Different thread different model | 1. Change model in thread | Other threads unaffected | P3 |

---

# 8. STORY ANALYSIS

## 8.1 Run Analysis

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ANL-001 | Open analysis panel | 1. Click Review tab | Analysis dashboard opens | P1 |
| ANL-002 | Run new analysis | 1. Click "Run Analysis" | Analysis dialog opens | P1 |
| ANL-003 | Select analysis types | 1. Check Synopsis, Timeline, etc. | Types selected | P1 |
| ANL-004 | Select scope | 1. Choose Full Manuscript or specific chapters | Scope selected | P2 |
| ANL-005 | Analysis runs with progress | 1. Click Run | Progress indicator shows | P1 |
| ANL-006 | View analysis results | 1. Wait for completion | Results display | P1 |
| ANL-007 | Cancel analysis | 1. Click Cancel during run | Analysis stops | P2 |

## 8.2 Analysis Types

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ANL-010 | Synopsis analysis | 1. Run Synopsis | Story summary generated | P1 |
| ANL-011 | Timeline analysis | 1. Run Timeline | Chronological events listed | P1 |
| ANL-012 | Contradiction analysis | 1. Run Contradictions | Inconsistencies flagged | P1 |
| ANL-013 | Character arc analysis | 1. Run Character Arcs | Character development tracked | P2 |
| ANL-014 | Plot threads analysis | 1. Run Plot Threads | Narrative threads identified | P2 |
| ANL-015 | Foreshadowing analysis | 1. Run Foreshadowing | Setup/payoff patterns shown | P3 |

## 8.3 View Analysis

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ANL-020 | View past analyses | 1. Open Review | List of saved analyses | P1 |
| ANL-021 | Open analysis detail | 1. Click on analysis | Detailed view opens | P1 |
| ANL-022 | View insights | 1. Open analysis | Insights with severity levels | P2 |
| ANL-023 | Jump to scene from insight | 1. Click scene reference | Scene opens | P2 |
| ANL-024 | Dismiss insight | 1. Click dismiss | Insight marked dismissed | P3 |
| ANL-025 | Version warning | 1. Edit manuscript after analysis | Warning about stale analysis | P2 |

## 8.4 Delete Analysis

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ANL-030 | Delete analysis | 1. Click delete on analysis 2. Confirm | Analysis removed | P2 |

---

# 9. PLANNING VIEWS

## 9.1 Outline View

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PLN-001 | Open outline view | 1. Click Plan tab 2. Select Outline | Outline view displays | P1 |
| PLN-002 | View hierarchical outline | 1. View outline | Acts/Chapters/Scenes in tree | P1 |
| PLN-003 | Expand/collapse in outline | 1. Click expand | Children show/hide | P1 |
| PLN-004 | Click scene in outline | 1. Click scene | Scene opens in editor | P1 |

## 9.2 Grid View

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PLN-010 | Open grid view | 1. Select Grid view | Cards layout displays | P1 |
| PLN-011 | View scene cards | 1. View grid | Scene cards with title, status, word count | P1 |
| PLN-012 | Drag cards to reorder | 1. Drag card | Order changes | P2 |
| PLN-013 | Card shows codex links | 1. View card with links | Codex badges visible | P2 |
| PLN-014 | Filter grid by status | 1. Select status filter | Only matching cards shown | P3 |

## 9.3 Timeline View

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PLN-020 | Open timeline view | 1. Select Timeline | Visual timeline displays | P2 |
| PLN-021 | Scenes on timeline | 1. View timeline | Scenes positioned chronologically | P2 |
| PLN-022 | Click scene on timeline | 1. Click scene | Scene opens | P2 |
| PLN-023 | Zoom timeline | 1. Zoom in/out | Timeline detail changes | P3 |

## 9.4 Matrix View

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PLN-030 | Open matrix view | 1. Select Matrix | Character/scene matrix displays | P2 |
| PLN-031 | Characters on Y axis | 1. View matrix | Character names on left | P2 |
| PLN-032 | Scenes on X axis | 1. View matrix | Scenes across top | P2 |
| PLN-033 | Cell shows appearance | 1. View cell | Indicates if character in scene | P2 |
| PLN-034 | Click cell opens scene | 1. Click cell | Scene opens | P3 |

---

# 10. SNIPPETS

## 10.1 Manage Snippets

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SNP-001 | View snippets list | 1. Open Snippets panel | List of snippets | P2 |
| SNP-002 | Create snippet | 1. Click New Snippet 2. Enter title/content | Snippet created | P2 |
| SNP-003 | Edit snippet | 1. Click on snippet 2. Edit content | Changes saved | P2 |
| SNP-004 | Delete snippet | 1. Click delete 2. Confirm | Snippet removed | P2 |

## 10.2 Use Snippets

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SNP-010 | Insert snippet in editor | 1. Select snippet 2. Click Insert | Content inserted at cursor | P2 |
| SNP-011 | Snippet with formatting | 1. Create formatted snippet 2. Insert | Formatting preserved | P3 |

---

# 11. SEARCH

## 11.1 Global Search

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SRC-001 | Open search palette | 1. Cmd+K | Search palette opens | P1 |
| SRC-002 | Search by text | 1. Type query | Results from scenes and codex | P1 |
| SRC-003 | Results show context | 1. Search | Matching text preview shown | P1 |
| SRC-004 | Click result opens item | 1. Click on result | Scene or codex entry opens | P1 |
| SRC-005 | Navigate with arrows | 1. Use up/down arrows | Selection moves | P2 |
| SRC-006 | Enter opens selected | 1. Press Enter | Selected item opens | P2 |
| SRC-007 | No results message | 1. Search for non-existent | "No results" shown | P2 |
| SRC-008 | Close palette with Escape | 1. Press Escape | Palette closes | P2 |

---

# 12. EXPORT & BACKUP

## 12.1 Export

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EXP-001 | Export as text | 1. Click Export 2. Select Text | TXT file created with manuscript content | P1 |
| EXP-002 | Export as DOCX | 1. Select DOCX export | Word document created | P1 |
| EXP-003 | DOCX preserves structure | 1. Export DOCX 2. Open | Acts/Chapters/Scenes as headings | P1 |
| EXP-004 | Export backup JSON | 1. Export Backup | JSON file with all project data | P1 |
| EXP-005 | Choose export location | 1. Export | File picker for save location | P2 |

## 12.2 Import

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EXP-010 | Import backup | 1. Click Import 2. Select JSON backup | Project restored | P1 |
| EXP-011 | Import validates backup | 1. Import invalid JSON | Error message | P2 |
| EXP-012 | Import creates new project | 1. Import | New project created | P1 |

## 12.3 Google Drive

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| EXP-020 | Connect Google Drive | 1. Click Connect 2. OAuth flow | Account connected | P2 |
| EXP-021 | Backup to Drive | 1. Click Backup to Drive | Backup uploaded | P2 |
| EXP-022 | List Drive backups | 1. View Drive backups | List of backups | P2 |
| EXP-023 | Restore from Drive | 1. Select backup 2. Restore | Project restored | P2 |
| EXP-024 | Delete Drive backup | 1. Delete backup | Backup removed from Drive | P2 |
| EXP-025 | Disconnect Drive | 1. Click Disconnect | Account disconnected | P3 |

---

# 13. TRASH

## 13.1 Trash Operations

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| TRS-001 | View trash | 1. Open Trash panel | List of deleted items | P2 |
| TRS-002 | Restore from trash | 1. Click Restore | Item restored to original location | P1 |
| TRS-003 | Permanent delete | 1. Click Delete Permanently | Item permanently removed | P2 |
| TRS-004 | Empty trash | 1. Click Empty Trash | All trash items deleted | P2 |
| TRS-005 | Trash shows item type | 1. View trash | Shows if Scene, Codex, etc. | P3 |

---

# 14. SETTINGS

## 14.1 General Settings

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SET-001 | Open settings | 1. Click Settings gear | Settings dialog opens | P1 |
| SET-002 | Toggle dark mode | 1. Click theme toggle | Theme changes | P1 |
| SET-003 | Change auto-save interval | 1. Adjust auto-save setting | Setting saves | P3 |

## 14.2 AI Connections

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SET-010 | View AI connections | 1. Click AI tab | List of configured providers | P1 |
| SET-011 | Add AI connection | 1. Click Add 2. Select provider 3. Enter API key | Connection saved | P1 |
| SET-012 | Test connection | 1. Click Test | Success/failure shown | P2 |
| SET-013 | Delete connection | 1. Click Delete 2. Confirm | Connection removed | P1 |
| SET-014 | Edit connection | 1. Click Edit 2. Change key | Updated | P2 |
| SET-015 | Invalid API key error | 1. Enter invalid key 2. Test | Error message | P2 |

## 14.3 API Key Security

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SET-020 | API key stored securely | 1. Add key 2. Check filesystem | Key NOT in plain text files | P1 |
| SET-021 | API key in keychain | 1. Check OS keychain | Key stored in system keychain | P1 |
| SET-022 | API key masked in UI | 1. View saved connection | Key shows as •••••• | P2 |

---

# 15. SERIES MANAGEMENT

## 15.1 Series CRUD

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SER-001 | View series | 1. Open Series panel | List of series displayed | P1 |
| SER-002 | Create series | 1. Click New Series 2. Enter name 3. Confirm | Series created, appears in list | P1 |
| SER-003 | Create duplicate series name | 1. Create series "Fantasy" 2. Create another "Fantasy" | Error: "Series already exists" | P2 |
| SER-004 | View projects in series | 1. Click on series | Associated projects listed by book number | P1 |
| SER-005 | Delete empty series | 1. Delete series with no projects | Series removed | P2 |
| SER-006 | Delete series with projects | 1. Try to delete series with projects | Warning: must reassign or delete projects first | P1 |
| SER-007 | Edit series name | 1. Click edit 2. Change name 3. Save | Name updated across all references | P2 |

## 15.2 Series-First Enforcement

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SER-010 | **Cannot create project without series** | 1. Open Create Project 2. Skip series | Create button disabled | P1 |
| SER-011 | Series dropdown populated | 1. Open Create Project | All existing series in dropdown | P1 |
| SER-012 | Inline series creation | 1. Click "Create New Series" 2. Enter name | Series created, auto-selected | P1 |
| SER-013 | Project card shows series name | 1. View dashboard | Cards show "{Series} Book X" format | P1 |
| SER-014 | Codex shared across series | 1. Create character in Book 1 2. Open Book 2 | Character visible in Book 2's codex | P1 |
| SER-015 | Codex stored at series level | 1. Check filesystem | Codex files in `series/{id}/codex/` | P1 |

---

# 16. COLLABORATION

## 16.1 Real-Time Sync

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| COL-001 | Connect to collaborator | 1. Share room code 2. Other user joins | Connection established | P3 |
| COL-002 | See collaborator cursor | 1. Both users in same scene | Other user's cursor visible | P3 |
| COL-003 | Real-time text sync | 1. User A types 2. User B sees | Text appears in real-time | P3 |
| COL-004 | Conflict resolution | 1. Both edit same area | Edits merged correctly | P3 |

## 16.2 Multi-Tab

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| COL-010 | Multi-tab warning | 1. Open same project in 2 tabs | Warning displayed | P2 |
| COL-011 | Tab leader election | 1. Have 2 tabs | One becomes leader for writes | P3 |

---

# 17. SLASH COMMANDS

## 17.1 Slash Command Usage

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SLH-001 | Trigger slash menu | 1. Type / at line start | Command palette appears | P2 |
| SLH-002 | Insert heading | 1. Type / 2. Select Heading 1 | H1 inserted | P2 |
| SLH-003 | Insert section break | 1. Type / 2. Select Section | Section break inserted | P2 |
| SLH-004 | Filter commands | 1. Type /hea | Shows only heading commands | P2 |
| SLH-005 | Cancel with Escape | 1. Type / 2. Press Escape | Menu closes | P2 |

---

# 18. NAVIGATION

## 18.1 Sidebar Navigation

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NAV-001 | Toggle sidebar | 1. Click toggle or hotkey | Sidebar shows/hides | P1 |
| NAV-002 | Navigate to Codex | 1. Click Codex in sidebar | Codex panel opens | P1 |
| NAV-003 | Navigate to Chat | 1. Click Chat | Chat panel opens | P1 |
| NAV-004 | Navigate to Review | 1. Click Review | Review panel opens | P1 |
| NAV-005 | Navigate to Plan | 1. Click Plan | Plan view opens | P1 |
| NAV-006 | Navigate to Snippets | 1. Click Snippets | Snippets panel opens | P2 |
| NAV-007 | Navigate to Settings | 1. Click Settings | Settings dialog opens | P1 |

## 18.2 Breadcrumbs

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| NAV-010 | Breadcrumb shows path | 1. Open scene | Shows Act > Chapter > Scene | P2 |
| NAV-011 | Click breadcrumb navigates | 1. Click on Chapter in breadcrumb | Chapter node selected | P3 |

---

# 19. KEYBOARD SHORTCUTS

## 19.1 Global Shortcuts

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| KEY-001 | Cmd+K opens search | 1. Press Cmd+K | Search palette opens | P1 |
| KEY-002 | Cmd+S saves | 1. Press Cmd+S | Triggers save | P1 |
| KEY-003 | Cmd+Z undoes | 1. Press Cmd+Z | Last action undone | P1 |
| KEY-004 | Cmd+Shift+Z redoes | 1. Press Cmd+Shift+Z | Last undo redone | P1 |

## 19.2 Editor Shortcuts

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| KEY-010 | Cmd+B bolds | 1. Select 2. Cmd+B | Text bolded | P1 |
| KEY-011 | Cmd+I italics | 1. Select 2. Cmd+I | Text italicized | P1 |
| KEY-012 | Cmd+F finds | 1. Cmd+F | Find dialog opens | P1 |

---

# 20. ERROR HANDLING

## 20.1 Error States

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ERR-001 | Network error on AI | 1. Disconnect network 2. Try AI feature | Clear error message | P1 |
| ERR-002 | Invalid API key error | 1. Use invalid key | "Invalid API key" message | P1 |
| ERR-003 | File system error | 1. Delete project folder manually 2. Try to open | Graceful error | P2 |
| ERR-004 | Corrupted file handling | 1. Corrupt a scene file | Error with recovery option | P2 |
| ERR-005 | Rate limit error | 1. Exceed API rate limit | "Rate limited" message | P2 |

---

## Test Case Summary

| Category | Count |
|----------|-------|
| Project Management | 24 |
| Manuscript Structure | 25 |
| Scene Editor | 45 |
| Mentions | 10 |
| AI Assistance | 20 |
| Codex | 35 |
| Chat | 25 |
| Analysis | 20 |
| Planning Views | 20 |
| Snippets | 6 |
| Search | 8 |
| Export/Backup | 15 |
| Trash | 5 |
| Settings | 15 |
| Series | 5 |
| Collaboration | 5 |
| Slash Commands | 5 |
| Navigation | 10 |
| Keyboard Shortcuts | 6 |
| Error Handling | 5 |
| **TOTAL** | **~304** |

---

## Priority Distribution

| Priority | Count | Description |
|----------|-------|-------------|
| P1 (Critical) | ~100 | Core functionality, must work |
| P2 (High) | ~120 | Important features, should work |
| P3 (Medium) | ~85 | Nice-to-have, can have bugs |

---

## Test Execution Notes

1. **Environment**: Test on macOS (primary), consider Windows/Linux
2. **Data**: Create test projects with sample content
3. **AI Testing**: Requires valid API keys for AI features
4. **Performance**: Note any slow operations (>2s)
5. **Regression**: Re-test after each major change
