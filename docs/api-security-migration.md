## Security Commands

### Store API Key

**Command**: `store_api_key`  
**Description**: Store AI provider API key in OS keychain (secure storage)

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `provider` | `string` | Yes | Provider name ("openai", "anthropic", "google", etc.) |
| `key` | `string` | Yes | API key to store |

**Side Effects**:
- Writes to OS keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service)
- Overwrites existing key for provider if present

**Returns**: `()`

**Frontend Example**:
```typescript
await invoke('store_api_key', {
  provider: 'openai',
  key: 'sk-...'
});
```

**Security**:
- ✅ OS-level encryption
- ✅ Per-user isolation
- ✅ XSS-safe (not in localStorage)

---

### Get API Key

**Command**: `get_api_key`  
**Description**: Retrieve API key from OS keychain

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `provider` | `string` | Yes | Provider name |

**Returns**: `string` (API key)

**Frontend Example**:
```typescript
const key = await invoke<string>('get_api_key', {
  provider: 'openai'
});
```

**Error Handling**:
- Returns error if key not found
- Returns error if OS keychain access fails

---

### Delete API Key

**Command**: `delete_api_key`  
**Description**: Remove API key from OS keychain

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `provider` | `string` | Yes | Provider name |

**Returns**: `()`

**Frontend Example**:
```typescript
await invoke('delete_api_key', {
  provider: 'openai'
});
```

---

### List API Key Providers

**Command**: `list_api_key_providers`  
**Description**: Get list of all providers with stored keys

**Parameters**: None

**Returns**: `Vec<String>`

**Response Example**:
```json
["openai", "anthropic", "google"]
```

**Frontend Example**:
```typescript
const providers = await invoke<string[]>('list_api_key_providers');
```

---

## Migration Commands

### Check Project Version

**Command**: `check_project_version`  
**Description**: Get schema version of a project

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Returns**: `u32` (version number)

**Response Example**:
```json
1
```

**Frontend Example**:
```typescript
const version = await invoke<number>('check_project_version', {
  projectPath: '/path/to/project'
});
```

**Notes**:
- Returns 1 for projects without version field (backward compatible)
- Current schema version: 1

---

### Run Project Migrations

**Command**: `run_project_migrations`  
**Description**: Migrate project to current schema version

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `project_path` | `string` | Yes | Absolute path to project |

**Side Effects**:
- Creates backup (`.v{oldVersion}.{timestamp}.bak`)
- Runs sequential migrations (v1→v2→v3...)
- Updates version field in project.json
- Uses atomic writes (crash-safe)

**Returns**: `string` (success message)

**Response Example**:
```json
"Successfully migrated project from v1 to v2"
```

**Frontend Example**:
```typescript
const result = await invoke<string>('run_project_migrations', {
  projectPath: '/path/to/project'
});

console.log(result); // "Successfully migrated project from v1 to v2"
```

**Migration Flow**:
1. Detect current version from project.json
2. Find required migrations
3. Create backup file
4. Apply migrations sequentially
5. Update version field
6. Save with atomic write

**Error Handling**:
- Returns error if migration fails
- Backup preserved on failure
- User can restore from `.bak` file

---
