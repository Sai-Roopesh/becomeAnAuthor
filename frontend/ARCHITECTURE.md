# Frontend Architecture Patterns

This document describes the established patterns and best practices for the frontend architecture.

## State Management

### When to use what?

**useState**: Simple local component state (1-2 variables)
```typescript
const [count, setCount] = useState(0);
```

**useReducer**: Complex component state (3+ related variables)
```typescript
const [state, dispatch] = useDialogState(initialState, reducer);
```

**Zustand**: Global UI state (cross-component)
```typescript
const { focusMode, toggleFocusMode } = useEditorUIStore();
```

### useReducer Pattern

All dialog components use the `useDialogState` hook:

```typescript
// 1. Define state and actions
type State = {  
  value: string;
  isLoading: boolean;
};

type Action = 
  | { type: 'SET_VALUE'; payload: string }
  | { type: 'START_LOADING' };

// 2. Create reducer
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_VALUE':
      return { ...state, value: action.payload };
    case 'START_LOADING':
      return { ...state, isLoading: true };
    default:
      return state;
  }
}

// 3. Use in component
const [state, dispatch] = useDialogState(initialState, reducer);
dispatch({ type: 'SET_VALUE', payload: 'new value' });
```

## Form Validation

All forms use React Hook Form + Zod for type-safe validation:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tweakGenerateSchema, TweakGenerateFormData } from '@/lib/validations';

function MyForm() {
  const form = useForm<TweakGenerateFormData>({
    resolver: zodResolver(tweakGenerateSchema),
    defaultValues: {
      wordCount: '400',
      instructions: '',
    },
  });

  const onSubmit = (data: TweakGenerateFormData) => {
    // data is fully type-safe!
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('wordCount')} />
      {form.formState.errors.wordCount && (
        <span>{form.formState.errors.wordCount.message}</span>
      )}
    </form>
  );
}
```

## Type Safety

### Type Guards

Use type guards instead of unsafe type assertions:

```typescript
// ❌ Bad: Unsafe type assertion
const scene = node as Scene;
scene.content = 'text'; // Runtime error if node isn't a scene!

// ✅ Good: Type guard
if (isScene(node)) {
  node.content = 'text'; // Type-safe!
}

// ✅ Good: Assertion (throws if wrong type)
assertScene(node);
node.content = 'text'; // Type-safe after assertion
```

Available type guards:
- `isScene`, `isChapter`, `isAct`, `isBeat`, `isPart`, `isBook`
- `hasContent` - for Scene or Beat
- `isContainer` - for Chapter, Act, Part, or Book

Available assertions:
- `assertScene`, `assertChapter`, `assertAct`, etc.

## Performance

### React.memo

Wrap expensive components in `memo()`:

```typescript
export const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Component only re-renders when data changes
  return <div>{/* expensive renders */}</div>;
});
```

### useCallback

Memorize event handlers:

```typescript
const handleClick = useCallback(() => {
  // Handler doesn't recreate on every render
}, [dependencies]);
```

### useMemo

Memoize expensive calculations:

```typescript
const expensiveValue = useMemo(() => {
  return complexCalculation(data);
}, [data]);
```

## Error Handling

### ErrorBoundary

Wrap critical features in ErrorBoundary:

```typescript
<ErrorBoundary>
  <CriticalFeature />
</ErrorBoundary>
```

### useErrorHandler

Use in components for consistent error handling:

```typescript
const { handleError } = useErrorHandler();

try {
  await riskyOperation();
} catch (error) {
  handleError(error, 'riskyOperation');
  // Shows toast + logs to console
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useMyHook', () => {
  it('should do something', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(expected);
  });
});
```

## Code Splitting

### Lazy Loading Features

```typescript
import dynamic from 'next/dynamic';

const CodexFeature = dynamic(() => import('@/features/codex'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
```

### Bundle Analysis

```bash
ANALYZE=true npm run build
```

## File Organization

```
frontend/
├── components/        # Shared UI components
├── features/          # Feature modules
│   ├── editor/
│   ├── codex/
│   └── chat/
├── hooks/             # Custom React hooks
├── lib/               # Utilities & helpers
│   ├── type-guards.ts
│   ├── validations.ts
│   └── utils.ts
├── store/             # Zustand stores
└── domain/            # Business logic & types
```

## Best Practices

1. **Keep components small** (< 200 lines)
2. **Extract custom hooks** for reusable logic
3. **Use TypeScript strictly** (no `any`)
4. **Test critical paths** (hooks, utilities)
5. **Memo expensive components**
6. **Validate all user input**
7. **Handle all errors gracefully**
8. **Document complex logic**

## Migration Guide

### From useState to useReducer

```typescript
// Before
const [value1, setValue1] = useState('');
const [value2, setValue2] = useState(0);
const [loading, setLoading] = useState(false);

// After
const [state, dispatch] = useDialogState(
  { value1: '', value2: 0, loading: false },
  reducer
);
```

###From manual validation to Zod

```typescript
// Before
if (!value || value.length > 100) {
  setError('Invalid value');
}

// After
const schema = z.string().min(1).max(100);
const result = schema.safeParse(value);
if (!result.success) {
  setError(result.error.message);
}
```

## Resources

- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
