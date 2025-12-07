# ThreeJS Test Project

## CRITICAL: Mandatory Workflow

**BEFORE modifying ANY file, you MUST follow this exact process:**

### 1. Identify File Type & Load ALL Relevant Skills

Based on the file extension/type you're working on, read **ALL** skills (not just some):

| File Type | Skills to Read (ALL of them) |
|-----------|------------------------------|
| `.tsx` components | Read ALL files in `.claude/skills/react/` AND `.claude/skills/typescript/` AND `.claude/skills/sass/` |
| `.ts` files | Read ALL files in `.claude/skills/typescript/` |
| `.scss` files | Read ALL files in `.claude/skills/sass/` |
| Zustand stores | Read ALL files in `.claude/skills/zustand/` AND `.claude/skills/typescript/` |
| Git commits | Read `.claude/skills/git/commit-message-format/SKILL.md` |
| Tauri v2 code | Read ALL files in `.claude/skills/tauri-v2/` |
| Rust code | Read ALL files in `.claude/skills/rust/` |

**You MUST read ALL skills in the category, not pick and choose. Reading 3/5 skills means you'll miss 2 important conventions.**

### 2. Verification Checklist (Before Declaring Complete)

After making changes, verify you haven't violated ANY of these rules:

#### React/TSX Files
- [ ] Used `function` declarations (not arrow functions)
- [ ] Destructured props in parameters
- [ ] Organized hooks in correct order (state, refs, context, custom hooks, effects, handlers)
- [ ] Added cleanup functions to ALL useEffect hooks that need them
- [ ] NO inline `style={{}}` used (must use SCSS + BEM)
- [ ] Destructured all objects (no repeated `obj.prop` access)
- [ ] Used guard clauses (early returns, no deep nesting)
- [ ] Used `unknown` instead of `any`
- [ ] Used optional chaining where appropriate

#### SCSS Files
- [ ] Used BEM naming (`.block__element--modifier`)
- [ ] NO inline styles in TSX
- [ ] Used CSS variables for theming
- [ ] No deep nesting (max 3 levels)
- [ ] Used `@use` instead of `@import`
- [ ] Used project mixins when available
- [ ] Used `px` for font-sizes/gaps/spacing, appropriate units for dimensions

#### TypeScript Files
- [ ] Destructured objects always
- [ ] Used guard clauses (early returns)
- [ ] Used `unknown` over `any`
- [ ] Used type guards for unions
- [ ] Used `type` for objects/unions, `interface` for extensibility
- [ ] Used optional chaining (`?.`)
- [ ] Preferred Maps over switch statements for lookups

#### Zustand Stores
- [ ] Separated actions into `actions` object
- [ ] Used `partialize` for persistence
- [ ] Created custom selector hooks
- [ ] Enabled DevTools middleware

#### Git Commits
- [ ] Used format: `type(scope): subject`
- [ ] Added bullet points explaining changes
- [ ] Included Claude Code signature
- [ ] Used correct type (feat/fix/docs/style/refactor/test/chore)

### 3. If You Skip This Process

If you modify code without reading ALL relevant skills first, you WILL:
- Miss important conventions
- Write code that violates project standards
- Create inconsistent code that needs refactoring
- Waste the user's time with back-and-forth corrections

**There is NO excuse to skip reading all relevant skills. Period.**

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State**: Zustand
- **Styling**: SCSS with BEM naming convention
- **3D**: Three.js
- **Backend**: Tauri v2 (Rust)
- **Audio/Speech**: Vosk-rs, Whisper-rs

## Project Structure

```
src/
├── app/
│   ├── components/    # React components (.tsx + .scss)
│   ├── stores/        # Zustand stores
│   └── sass/          # Global SCSS (variables, mixins, utils)
├── assets/            # Static assets
└── main.tsx           # Entry point

src-tauri/             # Rust backend (Tauri v2)
```

## Environment Variables

See [.env.example](.env.example) for required variables.
- `VITE_BASE_PATH`: Required for routing

## Core Principles

1. **No shortcuts**: Read ALL skills before coding
2. **Consistency**: Follow existing patterns in the codebase
3. **Type safety**: Never use `any`, always use `unknown` or proper types
4. **No inline styles**: SCSS + BEM only
5. **Clean code**: Guard clauses, destructuring, proper hook organization

## Available Skills

<details>
<summary><strong>React Skills (9 files)</strong></summary>

- `env-variables` - Environment variable handling
- `event-listener-cleanup` - Cleanup side effects in useEffect
- `function-components` - Use function declarations
- `hooks-organization` - Standard hook ordering
- `props-destructuring` - Destructure in parameters
</details>

<details>
<summary><strong>TypeScript Skills (7 files)</strong></summary>

- `destructure-objects-always` - Always destructure objects
- `map-vs-switch-lookup` - Prefer Maps for lookups
- `prefer-unknown-over-any` - Use unknown, never any
- `type-guards-for-unions` - Type narrowing
- `type-vs-interface` - When to use each
- `use-guard-clauses` - Early returns, no nesting
- `use-optional-chaining` - Use `?.` operator
</details>

<details>
<summary><strong>SASS Skills (11 files)</strong></summary>

- `bem-naming` - BEM convention (required)
- `container-queries` - Modern responsive design
- `css-variables` - Theming with variables
- `functions` - SASS function utilities
- `loops` - @each, @for patterns
- `media-queries-responsive` - Breakpoint handling
- `no-deep-nesting` - Max 3 levels
- `no-inline-styles` - NEVER use style={{}}
- `supports-feature-queries` - @supports usage
- `use-project-mixins` - Available mixins
- `use-vs-import` - Use @use, not @import
</details>

<details>
<summary><strong>Zustand Skills (4 files)</strong></summary>

- `actions-object` - Separate actions pattern
- `custom-hooks` - Selector hooks
- `devtools-middleware` - DevTools integration
- `partialize-persist` - Persistence config
</details>

<details>
<summary><strong>Tauri v2 Skills (3 files)</strong></summary>

- `command-structure` - Command patterns
- `event-emission` - Event system
- `path-resolution` - Path handling
</details>

<details>
<summary><strong>Rust Skills (2 files)</strong></summary>

- `no-unwrap-production` - Proper error handling
- `result-error-handling` - Result<T, E> patterns
</details>

<details>
<summary><strong>Audio/Speech Skills (4 files)</strong></summary>

- `vosk-rs/streaming-chunks` - Streaming audio
- `whisper-rs/audio-preparation` - Audio preprocessing
- `whisper-rs/model-loading` - Model initialization
</details>

<details>
<summary><strong>Git Skills (1 file)</strong></summary>

- `commit-message-format` - Conventional commits
</details>

## Reminder

**You are not allowed to guess or skip steps. Read all relevant skills, follow the checklist, and verify your work before declaring a task complete.**

If you find yourself thinking "I'll just quickly fix this" without reading skills first, STOP. Read the skills.
