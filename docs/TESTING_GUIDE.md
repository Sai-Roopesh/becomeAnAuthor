# Test-Driven Development Guide

> **Last Updated**: January 5, 2026  
> **Purpose**: Comprehensive guide for implementing TDD in the Become An Author codebase

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [TDD Philosophy for This Project](#2-tdd-philosophy-for-this-project)
3. [Test Organization Standard](#3-test-organization-standard)
4. [Testing Strategy by Layer](#4-testing-strategy-by-layer)
5. [TDD Workflow](#5-tdd-workflow)
6. [Test Templates](#6-test-templates)
7. [Mocking Patterns](#7-mocking-patterns)
8. [Migration Checklist](#8-migration-checklist)

---

## 1. Current State Analysis

### Current Test Locations (Scattered)

```
frontend/
├── hooks/
│   ├── __tests__/               # Test folder for hooks
│   ├── use-ai.test.ts           ← ⚠️ Co-located
│   ├── use-debounce.test.ts
│   ├── use-dialog-state.test.ts
│   ├── use-error-handler.test.ts
│   ├── use-context-assembly.test.ts
│   ├── use-live-query.test.ts
│   ├── use-mobile.test.ts
│   └── use-tab-leader.test.ts
├── lib/__tests__/
│   └── ai-utils.test.ts         ← ⚠️ __tests__ folder
├── shared/utils/__tests__/
│   └── token-counter.test.ts    ← ⚠️ __tests__ folder
├── features/codex/utils/__tests__/
│   └── arcContextUtils.test.ts  ← ⚠️ __tests__ folder
├── features/search/components/__tests__/
│   └── search-components.test.tsx
├── components/__tests__/
│   └── error-boundary.test.tsx
└── infrastructure/
    ├── repositories/__tests__/
    │   └── TauriAnalysisRepository.test.ts
    └── services/__tests__/
        ├── document-export-service.test.ts
        ├── emergency-backup-service.test.ts
        └── model-discovery-service.test.ts
```

### Current Test Statistics

| Metric | Value |
|--------|-------|
| Test Files | 15+ |
| Total Tests | 100+ |
| All Passing | ✅ Yes |
| Coverage | Not measured |

### Critical Gaps

| Layer | Has Tests? | Priority |
|-------|-----------|----------|
| **Domain Entities** | ❌ No | High |
| **Repository Interfaces** | ❌ No | High |
| **Tauri Repositories** | ⚠️ Partial (1/18) | **Critical** |
| **Custom Hooks** | ✅ Partial (9/42+) | Medium |
| **Services** | ✅ Partial (3/10) | High |
| **UI Components** | ⚠️ Partial | Medium |
| **Rust Commands** | ❌ No | High |
| **E2E** | ⚠️ 1 file | Low |

---

## 2. TDD Philosophy for This Project

### The Red-Green-Refactor Cycle

```
    ┌─────────────────────────────────────────────┐
    │                                             │
    │   1. RED: Write a failing test first        │
    │      ↓                                      │
    │   2. GREEN: Write minimum code to pass      │
    │      ↓                                      │
    │   3. REFACTOR: Clean up without breaking    │
    │      ↓                                      │
    │   4. REPEAT                                 │
    │                                             │
    └─────────────────────────────────────────────┘
```

### TDD Benefits for This Architecture

| Benefit | How It Helps |
|---------|--------------|
| **Contract Definition** | Repository interfaces are tested before implementation |
| **Refactor Confidence** | 8-layer architecture changes safely |
| **Documentation** | Tests describe expected behavior |
| **Bug Prevention** | Catch IPC mismatches early |

### When to Use TDD vs Test-After

| Scenario | Approach |
|----------|----------|
| New entity/feature | **TDD** - Write tests first |
| New repository implementation | **TDD** - Contract testing |
| Bug fix | Write **failing test first** that reproduces bug |
| UI Component | Test-after is acceptable |
| Quick prototype | Skip tests, add later |

---

## 3. Test Organization Standard

### Recommended Structure

> [!IMPORTANT]
> **Consolidate all tests into `__tests__` folders** within each module.

```
frontend/
├── domain/
│   └── entities/
│       ├── types.ts
│       └── __tests__/
│           ├── types.test.ts          # Entity validation tests
│           └── type-guards.test.ts     # Type guard tests
├── infrastructure/
│   └── repositories/
│       ├── TauriNodeRepository.ts
│       ├── TauriCodexRepository.ts
│       └── __tests__/
│           ├── TauriNodeRepository.test.ts
│           ├── TauriCodexRepository.test.ts
│           └── mocks/
│               └── tauri-invoke.mock.ts
├── hooks/
│   ├── use-ai.ts
│   ├── use-auto-save.ts
│   └── __tests__/
│       ├── use-ai.test.ts
│       ├── use-auto-save.test.ts
│       └── fixtures/
│           └── mock-editor.ts
├── features/
│   └── editor/
│       ├── components/
│       │   └── TiptapEditor.tsx
│       └── __tests__/
│           ├── TiptapEditor.test.tsx
│           └── integration.test.ts
└── shared/
    └── utils/
        ├── ai-utils.ts
        └── __tests__/
            └── ai-utils.test.ts
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Unit test | `{filename}.test.ts` | `use-ai.test.ts` |
| Integration test | `{feature}.integration.test.ts` | `editor.integration.test.ts` |
| E2E test | `{flow}.spec.ts` | `character-arc.spec.ts` |
| Mock file | `{module}.mock.ts` | `tauri-invoke.mock.ts` |
| Fixture file | `{name}.fixture.ts` | `scene.fixture.ts` |

---

## 4. Testing Strategy by Layer

### Layer 1: Domain Entities (`domain/entities/`)

**What to test**: Type guards, schema validation, entity factories

```typescript
// frontend/domain/entities/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import { isAct, isChapter, isScene, type DocumentNode, type Scene } from '../types';

describe('Type Guards', () => {
    describe('isScene', () => {
        it('should return true for scene nodes', () => {
            const scene: Scene = {
                id: '1',
                type: 'scene',
                title: 'Test Scene',
                content: { type: 'doc', content: [] },
                // ... other required fields
            };
            expect(isScene(scene)).toBe(true);
        });

        it('should return false for act nodes', () => {
            const act = { type: 'act', title: 'Act 1' };
            expect(isScene(act as DocumentNode)).toBe(false);
        });
    });
});
```

**Priority**: High - These are foundational

---

### Layer 2: Repository Interfaces (`domain/repositories/`)

**What to test**: Interface contract compliance (via implementation tests)

The interfaces themselves don't need tests, but use them to define test contracts:

```typescript
// frontend/domain/repositories/__tests__/INodeRepository.contract.ts
import { describe, it, expect } from 'vitest';
import type { INodeRepository } from '../INodeRepository';

/**
 * Contract tests that any INodeRepository implementation must pass
 */
export function testNodeRepositoryContract(
    createRepository: () => INodeRepository,
    cleanup: () => Promise<void>
) {
    describe('INodeRepository Contract', () => {
        let repo: INodeRepository;

        beforeEach(() => {
            repo = createRepository();
        });

        afterEach(async () => {
            await cleanup();
        });

        it('should create and retrieve a node', async () => {
            const node = await repo.create({
                type: 'scene',
                title: 'Test Scene',
                parentId: null,
            });

            expect(node.id).toBeDefined();
            expect(node.title).toBe('Test Scene');

            const retrieved = await repo.get(node.id);
            expect(retrieved).toEqual(node);
        });

        it('should return null for non-existent node', async () => {
            const result = await repo.get('non-existent-id');
            expect(result).toBeNull();
        });
    });
}
```

---

### Layer 3: Tauri Repositories (`infrastructure/repositories/`)

**What to test**: IPC calls, data transformation, error handling

> [!CAUTION]
> **These are the most critical tests** - they catch frontend/backend mismatches.

```typescript
// frontend/infrastructure/repositories/__tests__/TauriNodeRepository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TauriNodeRepository } from '../TauriNodeRepository';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('TauriNodeRepository', () => {
    let repo: TauriNodeRepository;
    const mockProjectPath = '/mock/project/path';

    beforeEach(() => {
        vi.clearAllMocks();
        repo = TauriNodeRepository.getInstance();
        repo.setProjectPath(mockProjectPath);
    });

    describe('getByProject', () => {
        it('should call get_structure with correct params', async () => {
            const mockStructure = [
                { id: '1', type: 'act', title: 'Act 1', children: [] }
            ];
            vi.mocked(invoke).mockResolvedValue(mockStructure);

            const result = await repo.getByProject('project-id');

            expect(invoke).toHaveBeenCalledWith('get_structure', {
                projectPath: mockProjectPath,
            });
            expect(result).toEqual(mockStructure);
        });

        it('should throw if projectPath not set', async () => {
            repo.setProjectPath('');

            await expect(repo.getByProject('id'))
                .rejects.toThrow('Project path not set');
        });
    });

    describe('saveScene', () => {
        it('should transform content before saving', async () => {
            const mockMeta = { id: '1', title: 'Scene', wordCount: 100 };
            vi.mocked(invoke).mockResolvedValue(mockMeta);

            const content = { type: 'doc', content: [{ type: 'paragraph' }] };
            await repo.saveScene('scene-1', content, 'My Scene');

            expect(invoke).toHaveBeenCalledWith('save_scene_by_id', {
                projectPath: mockProjectPath,
                sceneId: 'scene-1',
                content: JSON.stringify(content),
            });
        });
    });

    describe('error handling', () => {
        it('should wrap Rust errors in descriptive messages', async () => {
            vi.mocked(invoke).mockRejectedValue('File not found');

            await expect(repo.get('non-existent'))
                .rejects.toThrow(/Failed to load node/);
        });
    });
});
```

---

### Layer 4: Custom Hooks (`hooks/`)

**What to test**: State management, side effects, callbacks

```typescript
// frontend/hooks/__tests__/use-auto-save.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '../use-auto-save';

// Mock dependencies
vi.mock('@/lib/core/save-coordinator', () => ({
    saveCoordinator: {
        scheduleSave: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@/infrastructure/services/emergency-backup-service', () => ({
    emergencyBackupService: {
        saveBackup: vi.fn(),
        getBackup: vi.fn().mockResolvedValue(null),
        deleteBackup: vi.fn(),
        cleanupExpired: vi.fn(),
    },
}));

describe('useAutoSave', () => {
    const mockEditor = {
        on: vi.fn(),
        off: vi.fn(),
        getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
        isDestroyed: false,
    };

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should register update listener on mount', () => {
        renderHook(() => useAutoSave('scene-1', mockEditor as any));

        expect(mockEditor.on).toHaveBeenCalledWith('update', expect.any(Function));
    });

    it('should debounce saves to 1 second intervals', async () => {
        const { saveCoordinator } = await import('@/lib/core/save-coordinator');
        
        renderHook(() => useAutoSave('scene-1', mockEditor as any));

        // Trigger update callback
        const updateCallback = mockEditor.on.mock.calls[0][1];
        act(() => updateCallback());

        // Should not save immediately
        expect(saveCoordinator.scheduleSave).not.toHaveBeenCalled();

        // Fast-forward 1 second
        act(() => vi.advanceTimersByTime(1000));

        expect(saveCoordinator.scheduleSave).toHaveBeenCalledWith(
            'scene-1',
            expect.any(Function)
        );
    });

    it('should cleanup listeners on unmount', () => {
        const { unmount } = renderHook(() => 
            useAutoSave('scene-1', mockEditor as any)
        );

        unmount();

        expect(mockEditor.off).toHaveBeenCalledWith('update', expect.any(Function));
    });
});
```

---

### Layer 5: UI Components (`features/*/components/`)

**What to test**: Rendering, user interactions, accessibility

```typescript
// frontend/features/editor/components/__tests__/EditorToolbar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorToolbar } from '../editor-toolbar';

describe('EditorToolbar', () => {
    const mockEditor = {
        chain: vi.fn(() => ({
            focus: vi.fn(() => ({
                toggleBold: vi.fn(() => ({ run: vi.fn() })),
                toggleItalic: vi.fn(() => ({ run: vi.fn() })),
            })),
        })),
        isActive: vi.fn(() => false),
    };

    it('should render formatting buttons', () => {
        render(<EditorToolbar editor={mockEditor as any} />);

        expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
    });

    it('should call toggleBold when bold button clicked', () => {
        render(<EditorToolbar editor={mockEditor as any} />);

        fireEvent.click(screen.getByRole('button', { name: /bold/i }));

        expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should show active state when format is active', () => {
        mockEditor.isActive.mockReturnValue(true);

        render(<EditorToolbar editor={mockEditor as any} />);

        const boldButton = screen.getByRole('button', { name: /bold/i });
        expect(boldButton).toHaveAttribute('data-active', 'true');
    });
});
```

---

### Layer 6: Rust Backend (`backend/src/commands/`)

**What to test**: Command logic, file I/O, error handling

```rust
// backend/src/commands/tests/scene_tests.rs
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    fn setup_test_project() -> (TempDir, String) {
        let dir = TempDir::new().unwrap();
        let project_path = dir.path().to_string_lossy().to_string();
        
        // Create manuscript directory
        fs::create_dir_all(dir.path().join("manuscript")).unwrap();
        fs::create_dir_all(dir.path().join(".meta")).unwrap();
        
        // Create structure.json
        let structure = serde_json::json!([]);
        fs::write(
            dir.path().join(".meta/structure.json"),
            serde_json::to_string(&structure).unwrap()
        ).unwrap();
        
        (dir, project_path)
    }

    #[test]
    fn test_save_and_load_scene() {
        let (_dir, project_path) = setup_test_project();
        
        // Save a scene
        let result = save_scene(
            project_path.clone(),
            "test-scene.md".to_string(),
            "Hello, world!".to_string(),
            Some("Test Scene".to_string()),
        );
        
        assert!(result.is_ok());
        let meta = result.unwrap();
        assert_eq!(meta.title, "Test Scene");
        assert_eq!(meta.word_count, 2); // "Hello, world!"
        
        // Load and verify
        let loaded = load_scene(project_path, "test-scene.md".to_string());
        assert!(loaded.is_ok());
        let scene = loaded.unwrap();
        assert_eq!(scene.content, "Hello, world!");
    }

    #[test]
    fn test_word_count_accuracy() {
        let (_dir, project_path) = setup_test_project();
        
        let text = "One two three. Four five, six! Seven—eight (nine) ten.";
        let result = save_scene(
            project_path,
            "count-test.md".to_string(),
            text.to_string(),
            None,
        );
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap().word_count, 10);
    }

    #[test]
    fn test_invalid_project_path() {
        let result = load_scene(
            "/nonexistent/path".to_string(),
            "scene.md".to_string(),
        );
        
        assert!(result.is_err());
    }
}
```

---

## 5. TDD Workflow

### For a New Feature

```
┌──────────────────────────────────────────────────────────────────┐
│  Example: Adding "Tags" to Scenes                                │
└──────────────────────────────────────────────────────────────────┘

Step 1: WRITE TESTS FIRST (Red Phase)
───────────────────────────────────────
1.1 Write domain entity test
    └── Test that Scene type accepts tags array

1.2 Write repository contract test  
    └── Test that getScene returns tags
    └── Test that saveScene persists tags

1.3 Write Rust command test
    └── Test save_scene writes tags to YAML
    └── Test load_scene parses tags from YAML

Step 2: IMPLEMENT (Green Phase)
───────────────────────────────────────
2.1 Add tags field to Scene type (frontend/domain/entities/types.ts)
2.2 Add tags field to SceneMeta struct (backend/src/models/scene.rs)
2.3 Update save_scene to write tags (backend/src/commands/scene.rs)
2.4 Update load_scene to read tags
2.5 Run tests → All pass ✅

Step 3: REFACTOR
───────────────────────────────────────
3.1 Clean up any duplication
3.2 Improve error messages
3.3 Run tests again → Still pass ✅
```

### Practical TDD Commands

```bash
# Watch mode for TDD (re-runs on file change)
npm run test:watch

# Run specific test file
npm test -- frontend/hooks/__tests__/use-ai.test.ts

# Run tests matching pattern
npm test -- --grep "should save"

# Generate coverage report
npm run test:coverage

# Run Rust tests
cd backend && cargo test
```

---

## 6. Test Templates

### Hook Test Template

```typescript
// frontend/hooks/__tests__/use-{name}.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { use{Name} } from '../use-{name}';

// Mock dependencies
vi.mock('@/infrastructure/di/AppContext', () => ({
    useAppServices: vi.fn(() => ({
        // Add mock services
    })),
}));

describe('use{Name}', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should return initial state', () => {
            const { result } = renderHook(() => use{Name}());
            
            expect(result.current.data).toBeUndefined();
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('{action}', () => {
        it('should {expected behavior}', async () => {
            const { result } = renderHook(() => use{Name}());

            await act(async () => {
                await result.current.{action}();
            });

            expect(result.current.{property}).toBe({expected});
        });
    });

    describe('error handling', () => {
        it('should handle errors gracefully', async () => {
            // Setup mock to throw
            
            const { result } = renderHook(() => use{Name}());

            await act(async () => {
                await result.current.{action}();
            });

            expect(result.current.error).toBeDefined();
        });
    });
});
```

### Repository Test Template

```typescript
// frontend/infrastructure/repositories/__tests__/Tauri{Entity}Repository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Tauri{Entity}Repository } from '../Tauri{Entity}Repository';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';

describe('Tauri{Entity}Repository', () => {
    let repo: Tauri{Entity}Repository;
    const mockProjectPath = '/test/project';

    beforeEach(() => {
        vi.clearAllMocks();
        repo = new Tauri{Entity}Repository();
        // Set project path if needed
    });

    describe('list', () => {
        it('should call correct Rust command', async () => {
            vi.mocked(invoke).mockResolvedValue([]);

            await repo.list();

            expect(invoke).toHaveBeenCalledWith('list_{entities}', {
                projectPath: expect.any(String),
            });
        });

        it('should transform response correctly', async () => {
            const rustResponse = [{ snake_case_field: 'value' }];
            vi.mocked(invoke).mockResolvedValue(rustResponse);

            const result = await repo.list();

            expect(result[0].camelCaseField).toBe('value');
        });
    });

    describe('save', () => {
        it('should serialize entity for Rust', async () => {
            vi.mocked(invoke).mockResolvedValue(undefined);

            await repo.save({ id: '1', name: 'Test' });

            expect(invoke).toHaveBeenCalledWith('save_{entity}', {
                projectPath: expect.any(String),
                {entity}: expect.objectContaining({ id: '1' }),
            });
        });
    });
});
```

### Component Test Template

```typescript
// frontend/features/{feature}/components/__tests__/{Component}.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { {Component} } from '../{Component}';

// Mock context if needed
vi.mock('@/infrastructure/di/AppContext', () => ({
    useAppServices: vi.fn(() => ({})),
}));

describe('{Component}', () => {
    const defaultProps = {
        // Default props
    };

    const renderComponent = (props = {}) => {
        return render(<{Component} {...defaultProps} {...props} />);
    };

    describe('rendering', () => {
        it('should render without crashing', () => {
            renderComponent();
            expect(screen.getByTestId('{component}-root')).toBeInTheDocument();
        });

        it('should display correct content', () => {
            renderComponent({ title: 'Test Title' });
            expect(screen.getByText('Test Title')).toBeInTheDocument();
        });
    });

    describe('interactions', () => {
        it('should handle click events', async () => {
            const onClick = vi.fn();
            renderComponent({ onClick });

            await userEvent.click(screen.getByRole('button'));

            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });

    describe('accessibility', () => {
        it('should have proper ARIA labels', () => {
            renderComponent();
            expect(screen.getByRole('button')).toHaveAccessibleName();
        });
    });
});
```

---

## 7. Mocking Patterns

### Mocking Tauri Invoke

```typescript
// frontend/test/mocks/tauri-invoke.mock.ts
import { vi } from 'vitest';

// Create a mock registry
export const mockInvokeHandlers = new Map<string, (...args: any[]) => any>();

// Setup mock
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn((command: string, args?: Record<string, unknown>) => {
        const handler = mockInvokeHandlers.get(command);
        if (handler) {
            return Promise.resolve(handler(args));
        }
        return Promise.reject(new Error(`No mock for command: ${command}`));
    }),
}));

// Usage in tests:
import { mockInvokeHandlers } from '@/test/mocks/tauri-invoke.mock';

beforeEach(() => {
    mockInvokeHandlers.set('list_projects', () => [
        { id: '1', title: 'Project 1' },
    ]);
});
```

### Mocking AppContext / Services

```typescript
// frontend/test/mocks/app-services.mock.ts
import { vi } from 'vitest';

export const createMockServices = () => ({
    nodeRepository: {
        get: vi.fn(),
        getByProject: vi.fn(),
        create: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
    },
    codexRepository: {
        list: vi.fn(),
        get: vi.fn(),
        save: vi.fn(),
        delete: vi.fn(),
    },
    chatRepository: {
        listThreads: vi.fn(),
        createThread: vi.fn(),
        getMessages: vi.fn(),
        createMessage: vi.fn(),
    },
    analysisService: {
        runAnalysis: vi.fn(),
        estimateTokens: vi.fn(),
    },
});

// In test file:
import { createMockServices } from '@/test/mocks/app-services.mock';

vi.mock('@/infrastructure/di/AppContext', () => ({
    useAppServices: vi.fn(() => createMockServices()),
}));
```

### Mocking localStorage

```typescript
// frontend/vitest.setup.ts (add to existing)

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn((key: string) => null),
    setItem: vi.fn((key: string, value: string) => {}),
    removeItem: vi.fn((key: string) => {}),
    clear: vi.fn(() => {}),
    length: 0,
    key: vi.fn((index: number) => null),
};

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
});
```

---

## 8. Migration Checklist

### Phase 1: Setup (Week 1)

- [ ] Create `frontend/test/` directory structure
- [ ] Add shared mocks (`tauri-invoke.mock.ts`, `app-services.mock.ts`)
- [ ] Add fixtures directory with sample data
- [ ] Update `vitest.setup.ts` with global mocks
- [ ] Add localStorage mock to setup

### Phase 2: Move Existing Tests (Week 1)

- [ ] Move `frontend/hooks/*.test.ts` → `frontend/hooks/__tests__/`
- [ ] Move `frontend/lib/__tests__/` (keep, just ensure consistent)
- [ ] Move `frontend/shared/utils/__tests__/` (keep)
- [ ] Update import paths if needed

### Phase 3: Critical Gaps (Week 2-3)

- [ ] **Repository tests** - Add tests for each Tauri repository
  - [ ] `TauriNodeRepository.test.ts`
  - [ ] `TauriProjectRepository.test.ts`
  - [ ] `TauriCodexRepository.test.ts`
  - [ ] `TauriChatRepository.test.ts`
  - [ ] `TauriSnippetRepository.test.ts`
  - [ ] `TauriSeriesRepository.test.ts`
- [ ] **Service tests** - Add tests for core services
  - [ ] `save-coordinator.test.ts`
  - [ ] `emergency-backup-service.test.ts`
  - [ ] `google-auth-service.test.ts`

### Phase 4: TDD for New Features (Ongoing)

- [ ] Before any new feature, write failing tests first
- [ ] Add pre-commit hook to run tests
- [ ] Add CI pipeline to run tests on push

### Phase 5: Coverage Goals

| Target | Minimum | Stretch |
|--------|---------|---------|
| Repositories | 90% | 95% |
| Hooks | 70% | 85% |
| Services | 80% | 90% |
| Components | 50% | 70% |
| Overall | 60% | 75% |

---

## Quick Reference

### Test Commands

```bash
# Run all tests
npm test

# Watch mode (TDD)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific file
npm test -- frontend/hooks/__tests__/use-ai.test.ts

# Pattern matching
npm test -- --grep "Repository"

# Rust tests
cd backend && cargo test

# Rust single module
cd backend && cargo test scene
```

### File Locations

| Purpose | Location |
|---------|----------|
| Test config | `vitest.config.ts` |
| Test setup | `frontend/vitest.setup.ts` |
| Shared mocks | `frontend/test/mocks/` |
| Fixtures | `frontend/test/fixtures/` |
| E2E tests | `e2e/` |

---

*This guide should be updated as testing practices evolve. The goal is to reach 80%+ coverage on critical paths (repositories, hooks, services) while maintaining TDD discipline for new features.*
