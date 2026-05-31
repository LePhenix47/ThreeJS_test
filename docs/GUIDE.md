# Architecture Guide — Mindset & Decision Rules

## The Mental Model

Think of the architecture as **three nested layers**, each with a single job:

```
┌─────────────────────────────────┐
│  Experience  (engine layer)     │  "Make the 3D world run"
│  ┌───────────────────────────┐  │
│  │  World  (scene layer)     │  │  "Decide what's in the scene"
│  │  ┌─────────────────────┐  │  │
│  │  │  Entities / Objects │  │  │  "Be a thing in the scene"
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

Every class you create lives in exactly one layer. If you're not sure which, ask: *what does it do?*

---

## Layer 1: Experience (Engine)

**Job:** make the renderer run. Camera, renderer, sizing, clock, asset loading. None of this is visible to the user — it's infrastructure.

**What belongs here:**
- `Camera` — PerspectiveCamera + OrbitControls
- `Renderer` — WebGLRenderer configuration
- `Sizes` — tracks canvas/container dimensions
- `Time` — drives the rAF game loop
- `Resources` — loads all assets, provides typed getters

**What does NOT belong here:**
- Meshes, lights, materials — those belong in World or entities
- Any scene-specific logic

**Rule:** if removing it would break the renderer or game loop, it's Engine layer.

---

## Layer 2: World (Scene Orchestrator)

**Job:** decide what exists in the scene and when. `World` is the director — it doesn't do scene work itself, it creates the things that do.

**Currently:**
```
World/
  World.ts         ← director
  Environment.ts   ← lighting + env map
  Fox.ts           ← animated GLTF entity
```

**`World.ts` job:**
- Listens for `"textures-loaded"`, then creates scene objects
- Owns `Environment`, `Fox`, `Floor`, etc.
- Calls `update()` and `destroy()` on all of them

**`Environment.ts` job:**
- Sets up ambient conditions: env map, sunlight, background
- Not a mesh, not a model — it's the scene's atmospheric setup
- One per scene, always exists

**Rule:** if it sets the mood/context of the scene (lighting, fog, background), it's `Environment`. If it's a thing you can see and interact with, it's an entity.

---

## Layer 3: Entities (Scene Objects)

**Job:** be a specific thing in the scene. Mesh creation, shadow config, animations, material setup — all self-contained.

**Examples:** `Fox`, `Floor`, `Tree`, `Car`

**Each entity class:**
1. Gets its resources from `resources.getTexture(...)` / `resources.getGltf(...)`
2. Creates its own geometry, material, mesh
3. Adds itself to `scene`
4. Optionally has `update()` for animation
5. Optionally has `addDebugFolders()` for GUI

**Template:**
```ts
class Floor implements Updatable, Destroyable {
  private model: THREE.Mesh;
  private guiRegistry: GUIStateRegistry<{...}> | null = null;

  private get scene()     { return this.experience!.scene; }
  private get resources() { return this.experience!.resources; }
  private get debug()     { return this.experience!.debug; }

  constructor() {
    this.experience = Experience.instance;
    this.initMesh();
    this.scene.add(this.model);
    if (this.debug.isActive) this.addDebugFolders();
  }

  private initMesh = () => { /* create geometry + material + mesh */ };
  private addDebugFolders = () => { /* GUIStateRegistry setup */ };

  public update = () => { /* per-frame logic if needed */ };
  public destroy = () => { this.guiRegistry?.dispose(); };
}
```

**Rule:** one class per distinct visible object. If it has its own material/geometry/animation, it's its own class.

---

## GUI + GUIStateRegistry Rules

### When to add GUI
Only in `addDebugFolders()`, only called when `this.debug.isActive`. Never hardcode tweakable values elsewhere — put them in GUI state.

### What GUIStateRegistry does
- Persists slider values to sessionStorage across reloads
- Proxy intercepts writes → calls your `bind()` callback → applies to scene
- No `.onChange()` needed on GUI controls — Proxy handles it

### How to structure GUI state
```ts
// 1. Define state with sensible defaults (matching your constructor values)
const registry = new GUIStateRegistry("my-class-gui-state", {
  roughness: 0.5,
  metalness: 0.2,
});

// 2. Bind each key to its scene effect
registry
  .bind("roughness", (v) => { material.roughness = v; })
  .bind("metalness", (v) => { material.metalness = v; });

// 3. Add controls — no .onChange needed
folder.add(registry.state, "roughness", 0, 1, 0.001);
folder.add(registry.state, "metalness", 0, 1, 0.001);

// 4. Store + dispose
this.guiRegistry = registry;
```

### What goes in GUI state
- Material properties (roughness, metalness, opacity)
- Light intensities, colors
- Animation selection
- Any value you'd want to tweak while the scene is running

### What does NOT go in GUI state
- Geometry parameters that trigger a full rebuild — use `bindFinal()` instead
- Things that don't change (mesh position if it's always the same)

---

## Decision Checklist

**"Should this be a new class?"**
- Is it a distinct visible thing (mesh/model)? → Entity class
- Is it atmospheric/ambient (light, fog, env map)? → Environment or its own class if complex
- Is it engine infrastructure? → `Experience/three/` or `Experience/utils/`
- Is it just a helper function with no state? → standalone function, not a class

**"Where do I get resources?"**
- Always from `this.resources.getTexture(name, mapKey)` / `getCubeTexture()` / `getGltf()`
- Never access `resources.items[name]` directly — use the typed getters

**"What interfaces do I implement?"**
- Has per-frame logic? → `Updatable`
- Changes when canvas resizes? → `Resizable`
- Needs cleanup on unmount? → `Destroyable`
- Entities: usually `Updatable + Destroyable`
- Engine modules: usually all three

**"When do I wire update/resize/destroy?"**
- `Experience` calls `camera.update()`, `renderer.update()` on tick
- `World` should call `fox.update()`, `floor.update()` etc. in its own `update()`
- `Experience.destroy()` calls `world.destroy()` → world calls `fox.destroy()`, `environment.destroy()`

**"Where does my class log its own name?"**
- `console.log("ClassName")` at the end of the constructor — confirms instantiation order
