# AI Prompt Injection Rules

This directory contains rules that should be injected into AI prompts to ensure architectural consistency.

---

## Files

### 1. `rules.md` (Full Version)
**Size**: ~12 KB  
**Use Case**: When implementing new features or major changes

**Contains**:
- Complete architecture rules
- Detailed examples for each pattern
- Common mistakes and corrections
- Implementation workflow
- Comprehensive checklists

**When to Inject**: 
- Creating new features
- Refactoring existing code
- Complex implementations requiring multiple layers

---

### 2. `rules-quick.md` (Condensed Version)
**Size**: ~2 KB  
**Use Case**: Quick fixes, small changes, or when token budget is limited

**Contains**:
- Essential rules only
- Quick reference patterns
- Zero-tolerance violations
- Fast implementation order

**When to Inject**:
- Bug fixes
- Small component changes
- Simple updates
- Token-constrained prompts

---

## How to Use

### For ChatGPT / Claude / Gemini

**Option 1: Manual Injection**
```
I'm working on [feature name] in the Become An Author codebase.

[Paste contents of rules.md or rules-quick.md here]

Now, please help me implement [specific request]...
```

**Option 2: File Reference (if supported)**
```
I'm working on the Become An Author codebase.
Please read and follow the rules in .ai/rules.md

Now implement: [specific request]
```

---

### For Cursor / AI-Powered IDEs

**Add to `.cursorrules` or equivalent**:
```
Follow the architecture rules defined in .ai/rules.md for all code changes.

Key requirements:
- Use repository pattern (never direct db access in components)
- Feature isolation (no cross-feature imports)
- Proper layer separation (domain → infrastructure → presentation)
- Data serialization before IndexedDB storage
```

---

### For GitHub Copilot

Add to repository documentation or use inline comments:
```typescript
// ARCHITECTURE: Follow rules in .ai/rules.md
// - Use repository hooks, not direct db access
// - Serialize data before IndexedDB: JSON.parse(JSON.stringify(data))
// - Import toast from @/lib/toast-service, not 'sonner'
```

---

## Quick Decision Tree

```
Need to add new feature?
├─ Yes → Use rules.md (full version)
│   └─ Follow checklist for repositories, services, hooks
│
└─ No → Small change?
    ├─ Yes → Use rules-quick.md
    └─ No → Major refactor → Use rules.md + consult architecture_doc.md
```

---

## Enforcement Strategy

### Before Any AI Interaction

1. **Identify Change Scope**
   - New feature? → Full rules
   - Bug fix? → Quick rules
   - Refactor? → Full rules

2. **Inject Rules**
   - Copy/paste into prompt
   - Or reference if AI supports file reading

3. **Verify Output**
   - Check against rules
   - Run linter/TypeScript check
   - Test build

### After Implementation

1. **Code Review Checklist**
   - [ ] No direct `db` imports in components?
   - [ ] All repositories registered in DI?
   - [ ] Data serialized before IndexedDB?
   - [ ] Toast from toast-service?
   - [ ] Features in correct location?
   - [ ] No cross-feature dependencies?

2. **If Violations Found**
   - Document the pattern
   - Add to rules.md if common
   - Refactor immediately

---

## Updating These Rules

### When to Update

- New architectural patterns emerge
- Common mistakes identified
- Architecture changes

### How to Update

1. Edit `rules.md` with detailed explanation
2. Update `rules-quick.md` with condensed version
3. Update version number and date
4. Commit with clear message

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-01 | Initial creation - 5-layer architecture, repository pattern, zero-tolerance rules |

---

## Examples

### Example 1: Creating New Feature (Use Full Rules)

**Prompt**:
```
I need to create a new "Themes" feature for managing color schemes.

[Paste rules.md]

Please implement:
1. Repository for theme storage
2. Hook to access themes
3. Component to display theme selector
```

**Expected Output**:
- IThemeRepository interface in domain/
- DexieThemeRepository in infrastructure/
- use-theme-repository hook
- AppContext registration
- ThemeSelector component in features/themes/

---

### Example 2: Bug Fix (Use Quick Rules)

**Prompt**:
```
There's a bug where themes aren't saving.

[Paste rules-quick.md]

Fix the save function in ThemeRepository
```

**Expected Output**:
- Adds JSON.parse(JSON.stringify()) serialization
- Uses repository pattern correctly
- No direct db access

---

## Integration with Development Workflow

### Step 1: Planning
- Review full rules before starting
- Identify required layers
- Plan repository/service architecture

### Step 2: Implementation
- Inject rules into AI prompt
- Verify AI understands patterns
- Check output against checklist

### Step 3: Review
- Self-review against rules
- Run tests and linter
- Verify no violations

### Step 4: Commit
- Reference rules followed
- Note any deviations and why

---

## Troubleshooting

### AI Not Following Rules?

**Problem**: AI generates code that violates rules  
**Solution**: 
1. Use more explicit prompt: "CRITICAL: You MUST follow these rules exactly"
2. Break request into smaller steps
3. Review and correct each step before proceeding

### Rules Too Long for Prompt?

**Problem**: Token limit exceeded  
**Solution**:
1. Use rules-quick.md instead
2. Or extract only relevant sections
3. Reference specific rule numbers

### Rules Unclear?

**Problem**: AI misinterprets rules  
**Solution**:
1. Add clarifying examples to rules.md
2. Update with specific edge cases
3. Make zero-tolerance items more explicit

---

## Additional Resources

- **Full Architecture**: `docs/architecture_doc.md`
- **Dependency Analysis**: `docs/dependency_analysis.md`
- **Troubleshooting**: `docs/troubleshooting.md`
- **Maintenance Log**: `docs/maintenance.md`

---

**Created**: 2025-12-01  
**Purpose**: Prevent architectural drift in AI-assisted development  
**Status**: Active - Use for all AI interactions
