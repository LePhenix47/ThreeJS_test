# ThreeJS Test Project

## All Claude Responses

Keep your responses concise, ELI5, and actionable
When reporting to me, be extremely concise, load-bearing words only. Priorities: user understanding > concision > grammar. Directive not recap → never padding. Split-second read. Do not compromise on meaning.  Presenting data: use tables.
End with: *DO THIS* block → concrete next actions for user, numbered, priority-first. Spell out reply options on decisions. Omit only when no user action.


## CRITICAL: Mandatory Workflow

**BEFORE modifying ANY file, you MUST follow this exact process:**

### 1. Identify File Type & Load ALL Relevant Skills

Based on the file extension/type you're working on, read **ALL** skills (not just some):

| File Type                         | Skills to Read (ALL of them)                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `.tsx` components                 | Read ALL files in `.claude/skills/react/` AND `.claude/skills/typescript/` AND `.claude/skills/sass/` |
| `.ts` files                       | Read ALL files in `.claude/skills/typescript/`                                                        |
| `.scss` files                     | Read ALL files in `.claude/skills/sass/`                                                              |
| Zustand stores                    | Read ALL files in `.claude/skills/zustand/` AND `.claude/skills/typescript/`                          |
| Git commits                       | Read `.claude/skills/git/commit-message-format/SKILL.md`                                              |
| World entities / Three.js modules | Read ALL files in `.claude/skills/threejs-experience/`                                                |

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

## Project Structure

```
src/
├── components/         # React components (.tsx + .scss)
├── modules/
│   ├── Experience/     # Three.js core (singleton, resources, utils)
│   └── World/          # World entities (Firework, Galaxy, Environment, ...)
├── routes/              # TanStack Router routes
├── sass/                # Global SCSS (variables, mixins, themes)
├── stores/              # Zustand stores
├── utils/               # Shared TS utilities (enums, placement, numbers, ...)
├── shaders/              # .glsl shader files
└── main.tsx              # Entry point
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
<summary><strong>React Skills (5 files)</strong></summary>

- `env-variables` - Environment variable handling
- `event-listener-cleanup` - Cleanup side effects in useEffect
- `function-components` - Use function declarations
- `hooks-organization` - Standard hook ordering
- `props-destructuring` - Destructure in parameters

</details>

<details>
<summary><strong>TypeScript Skills (10 files)</strong></summary>

- `destructure-objects-always` - Always destructure objects
- `map-vs-switch-lookup` - Prefer Maps for lookups
- `prefer-unknown-over-any` - Use unknown, never any
- `type-guards-for-unions` - Type narrowing
- `type-vs-interface` - When to use each
- `use-guard-clauses` - Early returns, no nesting
- `use-optional-chaining` - Use `?.` operator
- `config-key-subset-typing` - Type a config's keys against a subset of another type's keys
- `comment-prefixes` - Better Comments convention (`?`/`*`/`!`/`TODO`) — when and how to use each prefix
- `layered-enums` - Split a flat enum into structural + semantic layers for indexing matrices/packed data

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
<summary><strong>Git Skills (1 file)</strong></summary>

- `commit-message-format` - Conventional commits

</details>

<details>
<summary><strong>ThreeJS Experience Skills (10 files)</strong></summary>

- `resources-gate` - When to gate entity construction behind `resources.on("textures-loaded", ...)`
- `entity-base-classes` - Decision tree: MeshEntity / PointsEntity / GltfEntity / TexturedMeshEntity / TexturedGltfEntity / EnvironmentEntity
- `asset-source-registration` - Individual source files, `?url` for GLBs, `as const satisfies Source`, `textureArray` sources
- `debug-gui-registry` - GUIStateRegistry pattern, bind vs bindFinal, dispose
- `shader-approach` - Path A (ShaderMaterial + .glsl) vs Path B (onBeforeCompile ⚠️), structuring onBeforeCompile injections
- `entity-lifecycle` - Sub-system getters, constructor ordering, update(), destroy() checklist, code-quality checklist
- `shader-uniforms` - Declaring uniforms, per-frame update, shared refs, u-prefix convention, GSAP tweening, resize-reactive uniforms
- `composite-entities` - Pool pattern and shared-resource group pattern for entities made of multiple sub-entities
- `particle-buffer-geometry` - Enum-indexed buffer attributes, placement utils, GUI-state fallback getter for particle systems
- `web-worker-offload` - Manager+Worker pattern for offloading per-frame heavy computation off the main thread

</details>

## Reminder

**You are not allowed to guess or skip steps. Read all relevant skills, follow the checklist, and verify your work before declaring a task complete.**

If you find yourself thinking "I'll just quickly fix this" without reading skills first, STOP. Read the skills.
