---
name: comment-prefixes
description: Use when writing or editing any comment — covers the Better Comments prefix convention (? for why, * for important, ! for critical/temporary, TODO for todos) and the rule to never strip these prefixes from existing comments.
---

# Comment Prefixes

This project uses the Better Comments VS Code extension. Comment prefixes are intentional color codes, not typos or style violations to "clean up."

## Prefixes

| Prefix | Meaning | Use for |
|---|---|---|
| `? ` | Info | Non-obvious reasoning, a derivation, a gotcha — the WHY |
| `* ` | Important | Something the reader must notice |
| `! ` | Error / temporary | Something wrong, or a marker to remove before shipping |
| `TODO` | Todo | Work still to do |

## Format

Single line: `// prefix ...`.

```typescript
// ? Material provided externally by ShadingGroup — shared across all shading entities
this.deltaMs = Math.floor(1_000 / 60); // ? Avoids potential 1st frame bugs
```

Multiline: `/*` alone on its own line, prefix repeated on every content line, closing `*/` alone on its own line. Better Comments only colors a block when the prefix starts the line right after `/*` — putting the prefix on the opening line itself breaks highlighting.

```typescript
/*
  ? unproject() gives world-space coords but perspective projection is non-linear —
  ? ANY fixed NDC z lands very close to the near plane.
*/

/*
  ! CRITICAL: GLSL function definitions cannot go inside main().
  ! Custom functions must be injected via #include <common> (outside main).
*/
```

## Rule

Never strip or "fix" these prefixes when touching nearby code — they drive syntax highlighting in the editor and are read as part of the codebase's convention, not incidental formatting.
