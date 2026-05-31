# Patterns

## Orchestrator

`Experience` owns all sub-modules, controls their initialization order, and routes lifecycle events (`resize`, `tick`, `destroy`) to each of them. Nothing in the 3D world happens without going through `Experience`.

```ts
public resize = () => {
  this.camera.resize();
  this.renderer.resize();
};

public update = () => {
  this.camera.update();
  this.renderer.update();
};
```

**Why:** centralizes control flow. Sub-modules don't know about each other — they only know about `Experience`. Adding a new module means wiring it in one place.

---

## Singleton

`Experience` uses a static `instance` property to enforce one instance at a time. Sub-modules grab the instance in their constructors rather than receiving it as a parameter.

```ts
// In any sub-module constructor:
if (!Experience.instance) throw new Error("Experience instance not found");
this.experience = Experience.instance;
```

**Why:** makes the orchestrator globally accessible without prop-drilling. Singleton is the *mechanism* that enables the orchestrator pattern — not the pattern itself.

---

## Private Getters for Experience Properties

Sub-modules expose frequently-used `experience.*` properties as private getters to avoid repeated chaining.

```ts
private get sizes() { return this.experience.sizes; }
private get scene() { return this.experience.scene; }
```

**Why:** reduces noise, single update point if the property name ever changes.

---

## Lifecycle Interfaces

Three granular interfaces enforce consistent lifecycle contracts:

```ts
interface Resizable  { resize(): void; }
interface Updatable  { update(): void; }
interface Destroyable { destroy(): void; }
```

`Camera`, `Renderer` implement all three. `World` only implements `Updatable, Destroyable` — no resize needed.

**Why:** TypeScript catches missing implementations at compile time. Granular interfaces mean no forced empty stubs.

---

## Update Method

Tied to the lifecycle interfaces, each sub-module exposes `update()`, `resize()`, and `destroy()` — the orchestrator calls them on every relevant event. Same contract, same call site.

```ts
// Experience drives all sub-modules:
public update = () => {
  this.camera.update();
  this.renderer.update();
};
```

The `Resizable`, `Updatable`, `Destroyable` interfaces enforce the contract at compile time.

**Why:** each module owns its own per-frame logic. The orchestrator doesn't care what `camera.update()` does internally — just that it exists. Classic game loop pattern ("Update Method patter" by Robert Nystrom — *Game Programming Patterns*).

---

## EventEmitter Base Class

`Sizes` and `Time` extend `EventEmitter` (custom implementation, not Node's). Enables decoupled communication — `Experience` subscribes to `"resize"` and `"tick"` without either class knowing about the other.

```ts
this.sizes.on("resize", this.resize);
this.time.on("tick", this.update);
```

---

## Resource Loading via THREE.LoadingManager

`Resources` accepts an external `THREE.LoadingManager` (from the React loading UI) or creates its own. Original callbacks are stored before being overwritten to prevent losing the React-side progress handlers.

```ts
// Store originals before handleLoadingManager overwrites onLoad
this.originalOnLoad = options?.loadingManager?.onLoad;
```

**Why:** `THREE.LoadingManager.onLoad` is a single property — assigning it overwrites any previous handler. Chaining ensures both the internal `"textures-loaded"` event and the React loading store's `setLoading(false)` fire.

---

## Typed Resource Getters

`Resources` exposes typed getters instead of raw `items[name]` access. Each getter narrows the return type and logs available items of the correct type on failure.

```ts
resources.getCubeTexture("environmentMapTexture"); // → THREE.CubeTexture
resources.getGltf("foxModel");                     // → GLTF
```

**Why:** `items` is `Record<string, Texture | CubeTexture | GLTF | DataTexture>` — accessing it directly gives a union. Getters provide a typed, fail-loud API with useful error messages.

---

## Zod at System Boundaries

Runtime validation is applied at the `Resources` constructor — the one place where external data (source definitions) enters the module. TypeScript types are inferred from Zod schemas to keep a single source of truth.

```ts
export const SourceSchema = z.discriminatedUnion("type", [...]);
export type Source = z.infer<typeof SourceSchema>;
```

**Why:** TypeScript only catches compile-time mistakes. Zod catches malformed source definitions at runtime before they silently break the loader.

---

## Deferred Scene Construction

`World` builds scene content only after resources finish loading, by listening to `"textures-loaded"`:

```ts
this.resources.on("textures-loaded", () => {
  this.environment = new Environment();
});
```

**Why:** avoids accessing textures before they exist. `Environment` can safely call `resources.getCubeTexture(...)` knowing all assets are ready.
