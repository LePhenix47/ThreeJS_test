---
name: comment-prefixes
description: Use when writing or editing any comment. Covers the Better Comments prefix convention (? for why, * for important, ! for critical/temporary, TODO for todos) and the rule to never strip these prefixes from existing comments.
---

# Comment Prefixes

This project uses the Better Comments VS Code extension. Comment prefixes are intentional color codes, not typos or style violations to "clean up."

## Prefixes

| Prefix | Meaning | Use for |
|---|---|---|
| `? ` | Info | Non-obvious reasoning, a derivation, a gotcha. The WHY |
| `* ` | Important | Something the reader must notice; combine with `⚠` for a critical warning |
| `! ` | Error / temporary | Something wrong, or a marker to remove before shipping |
| `TODO` | Todo | Work still to do |

## Format

Use `/* prefix ... */` block style, not `// prefix`:

```typescript
/* ? unproject() gives world-space coords but perspective projection is non-linear. *   ANY fixed NDC z lands very close to the near plane. */

/*
 * ⚠ CRITICAL: GLSL function definitions cannot go inside main().
 * → Custom functions must be injected via #include <common> (outside main).
 */
```

## Rule

Never strip or "fix" these prefixes when touching nearby code. They drive syntax highlighting in the editor and are read as part of the codebase's convention, not incidental formatting.
