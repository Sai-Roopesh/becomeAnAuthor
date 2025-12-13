# Common Development Workflows

**Quick recipes for common development tasks in Become An Author.**

## 🎯 Quick Navigation

- [Adding a New Feature](#adding-a-new-feature)
- [Adding a New Tauri Command](#adding-a-new-tauri-command)
- [Creating Custom Hooks](#creating-custom-hooks)
- [Adding Tests](#adding-tests)
- [Debugging](#debugging)

---

## Adding a New Feature

**Use Case:** You want to add a new major feature (e.g., "book cover generator")

### Step 1: Create Feature Folder

```bash
mkdir -p frontend/features/my-feature/components
mkdir -p frontend/features/my-feature/hooks
touch frontend/features/my-feature/index.ts
```

### Step 2: Define Domain Types

Add types to `frontend/domain/entities/types.ts`:

```typescript
export interface MyFeatureEntity {
  id: string;
  name: string;
  createdAt: Date;
  // ... other fields
}
```

### Step 3: Create Components

`frontend/features/my-feature/components/MyFeatureComponent.tsx`:

```tsx
import { Button } from '@/components/ui/button';

export function MyFeatureComponent() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">My Feature</h2>
      <Button>Action</Button>
    </div>
  );
}
```

### Step 4: Export from index.ts

`frontend/features/my-feature/index.ts`:

```typescript
export { MyFeatureComponent } from './components/MyFeatureComponent';
export { useMyFeature } from './hooks/use-my-feature';
```

### Step 5: Use in Page

`app/my-feature/page.tsx`:

```tsx
import { MyFeatureComponent } from '@/frontend/features/my-feature';

export default function MyFeaturePage() {
  return <MyFeatureComponent />;
}
```

---

## Adding a New Tauri Command

**Use Case:** You need backend functionality (e.g., "export to PDF")

### Step 1: Define Rust Model

`backend/src/models/my_model.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MyModel {
    pub id: String,
    pub name: String,
}
```

Add to `backend/src/models/mod.rs`:

```rust
pub mod my_model;
pub use my_model::MyModel;
```

### Step 2: Create Command Handler

`backend/src/commands/my_command.rs`:

```rust
use crate::models::MyModel;
use tauri::command;

#[command]
pub async fn my_command(param: String) -> Result<MyModel, String> {
    // Your logic here
    Ok(MyModel {
        id: "123".to_string(),
        name: param,
    })
}
```

Add to `backend/src/commands/mod.rs`:

```rust
pub mod my_command;
pub use my_command::*;
```

### Step 3: Register Command

`backend/src/lib.rs`:

```rust
use crate::commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            my_command,  // Add your command here
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Step 4: Create TypeScript Interface

`frontend/domain/repositories/IMyRepository.ts`:

```typescript
import { MyModel } from '@/frontend/domain/entities/types';

export interface IMyRepository {
  execute(param: string): Promise<MyModel>;
}
```

### Step 5: Implement Repository

`frontend/infrastructure/repositories/TauriMyRepository.ts`:

```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { IMyRepository } from '@/frontend/domain/repositories/IMyRepository';
import { MyModel } from '@/frontend/domain/entities/types';

export class TauriMyRepository implements IMyRepository {
  async execute(param: string): Promise<MyModel> {
    return await invoke<MyModel>('my_command', { param });
  }
}
```

### Step 6: Register in DI Container

`frontend/infrastructure/di/AppContext.tsx`:

```typescript
const myRepository = useMemo(() => new TauriMyRepository(), []);

<AppContext.Provider value={{
  // ... other repositories
  myRepository,
}}>
```

### Step 7: Use in Component

```tsx
const myRepo = useRepository<IMyRepository>('myRepository');
const result = await myRepo.execute('test');
```

---

## Creating Custom Hooks

**Use Case:** Extract reusable logic (e.g., "useDebounce")

### Step 1: Create Hook File

`frontend/hooks/use-my-hook.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useMyHook(initialValue: string) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    // Your logic here
    console.log('Value changed:', value);
  }, [value]);

  return { value, setValue };
}
```

### Step 2: Use Hook in Component

```tsx
import { useMyHook } from '@/frontend/hooks/use-my-hook';

function MyComponent() {
  const { value, setValue } = useMyHook('initial');
  
  return (
    <input value={value} onChange={(e) => setValue(e.target.value)} />
  );
}
```

---

## Adding Tests

**Use Case:** Write unit tests for your hook or component

### Step 1: Create Test File

`frontend/hooks/use-my-hook.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from './use-my-hook';

describe('useMyHook', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useMyHook('test'));
    
    expect(result.current.value).toBe('test');
  });

  it('should update value', () => {
    const { result } = renderHook(() => useMyHook('test'));
    
    act(() => {
      result.current.setValue('new value');
    });
    
    expect(result.current.value).toBe('new value');
  });
});
```

### Step 2: Run Tests

```bash
# Run specific test
npm test -- use-my-hook.test.ts

# Watch mode
npm run test:watch
```

### Step 3: Check Coverage

```bash
npm run test:coverage
```

---

## Debugging

### Debug Frontend

#### Using Chrome DevTools

1. Run app: `npm run tauri:dev`
2. Right-click in window → "Inspect Element"
3. Use Console, Network, Sources tabs

#### Using console.log

```tsx
console.log('Debug:', { sceneId, content });
```

### Debug Backend

#### Using println! (Rust)

`backend/src/commands/my_command.rs`:

```rust
#[command]
pub async fn my_command(param: String) -> Result<MyModel, String> {
    println!("Debug: param = {}", param);  // Shows in terminal
    // ... rest of code
}
```

#### View Tauri Logs

Logs appear in terminal where you ran `npm run tauri:dev`

### Debug IPC Calls

```typescript
import { invoke } from '@tauri-apps/api/tauri';

try {
  console.log('Calling command...');
  const result = await invoke('my_command', { param: 'test' });
  console.log('Result:', result);
} catch (error) {
  console.error('IPC Error:', error);
}
```

### Common Debugging Commands

```bash
# Type check
npx tsc --noEmit

# Lint check
npm run lint

# Check for circular dependencies
npm run deps:check

# View dependency graph
npm run deps:graph
```

---

## Quick Reference

### File Locations

| Task | Location |
|------|----------|
| Add page route | `app/my-page/page.tsx` |
| Add UI component | `frontend/components/ui/` |
| Add feature module | `frontend/features/my-feature/` |
| Add custom hook | `frontend/hooks/use-my-hook.ts` |
| Add domain type | `frontend/domain/entities/types.ts` |
| Add repository interface | `frontend/domain/repositories/` |
| Add repository implementation | `frontend/infrastructure/repositories/` |
| Add Tauri command | `backend/src/commands/my_command.rs` |
| Add Rust model | `backend/src/models/my_model.rs` |

### Common Commands

```bash
# Development
npm run tauri:dev        # Run full app
npm run dev              # Run frontend only
npm test                 # Run tests
npm run lint             # Lint code

# Building
npm run build            # Build frontend
npm run tauri:build      # Build desktop installer

# Code Quality
npm run deps:check       # Check dependencies
npx tsc --noEmit         # Type check
```

---

**More questions?** Check [CONTRIBUTING.md](../CONTRIBUTING.md) or [ARCHITECTURE_OVERVIEW.md](../ARCHITECTURE_OVERVIEW.md)
