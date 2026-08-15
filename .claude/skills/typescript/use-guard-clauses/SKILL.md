---
name: use-guard-clauses
description: Use when a TypeScript function's logic would otherwise nest inside if statements — use guard clauses (early returns) instead.
---

# Use Guard Clauses

## Pattern
Return early from functions to avoid nested if statements.

## ✅ Good (Guard Clauses)
```typescript
function processFile(file: File | null): string | null {
  if (!file) return null;
  if (file.size === 0) return null;
  if (!file.name.endsWith(".mp3")) return null;

  return transcribeFile(file);
}
```

## ❌ Bad (Nested Ifs)
```typescript
function processFile(file: File | null): string | null {
  if (file) {
    if (file.size > 0) {
      if (file.name.endsWith(".mp3")) {
        return transcribeFile(file);
      }
    }
  }
  return null;
}
```

## When to Use
- Functions with multiple validation conditions
- Error checking before main logic
- Null/undefined checks
- Permission/authentication checks

## Benefits
- Flatter code structure
- Easier to read and maintain
- Clearer error paths
- Reduces cognitive load
