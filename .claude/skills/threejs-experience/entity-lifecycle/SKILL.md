---
name: entity-lifecycle
description: Use when writing any World entity class — covers the Experience sub-system getter pattern, constructor method ordering per entity type, update() pattern, destroy() completeness checklist, and a code-quality checklist for config constants, event-subscription pairing, and option-type documentation.
metadata:
  type: reference
---

# Entity Lifecycle

## Arrow Functions vs Regular Methods

**Rule:** Use arrow functions **only** for methods passed as callbacks — i.e. methods detached from their object context when handed off to another caller.

```typescript
// ✅ Arrow — passed as reference to EventEmitter / GSAP / etc.
private onResize = (): void => { ... };
private onClickCanvas = (e: MouseEvent): void => { ... };

// ✅ Arrow — passed as inline callback
gsap.to(..., { onComplete: this.onComplete });

// ✅ Regular — always called as this.method(), this is never lost
public update(): void { ... }
public destroy(): void { ... }
protected setGeometry(): void { ... }
protected setMaterial(): void { ... }
private addDebugFolders(): void { ... }
```

**Why it matters:** Arrow class fields create a new function per instance (heap overhead). Regular methods live on the prototype and are shared across instances. Arrow syntax is only justified when `this` would otherwise be lost.

---

## Experience Sub-System Getters

Always access Experience sub-systems via private getters. Never store them as properties.

```typescript
private get scene()     { return this.experience!.scene; }
private get resources() { return this.experience!.resources; }
private get debug()     { return this.experience!.debug; }
private get time()      { return this.experience!.time; }
private get renderer()  { return this.experience!.renderer; }
private get pointer()   { return this.experience!.pointer; }
```

Only declare getters for sub-systems the entity actually uses.

---

## Constructor Ordering

### MeshEntity (pure geometry, no external assets)

```typescript
constructor() {
  super();
  this.experience = Experience.instance;
  if (!this.experience) throw new Error("...");

  this.setGeometry();         // create geometry (may read debugDefaults)
  this.setMaterial();         // create material (reads debugDefaults)
  this.setMesh();
  this.scene.add(this.mesh);
  if (this.debug?.isActive) this.addDebugFolders();
}
```

### GltfEntity with additional custom mesh (e.g. CoffeeSmoke — baked model + smoke plane)

```typescript
constructor() {
  super();
  this.experience = Experience.instance;
  if (!this.experience) throw new Error("...");

  this.setModel();             // load GLTF, extract mesh, assign this.model
  this.scene.add(this.model);
  this.setSmokeGeometry();
  this.setSmokeMaterial();     // reads debugDefaults
  this.setSmokeMesh();
  this.scene.add(this.smokeMesh);
  if (this.debug?.isActive) this.addDebugFolders();
}
```

### TexturedGltfEntity (GLTF + material replacement via onBeforeCompile)

```typescript
constructor() {
  super();
  this.experience = Experience.instance;
  if (!this.experience) throw new Error("...");

  this.setTextures();            // MUST run before setMaterial (material needs textures)
  this.setModelShadowMaterial(); // depth pass — mirrors deformation for shadow matching
  this.setMaterial();            // visible body material
  this.setOutlineMaterial();     // inverted-hull outline
  this.setModel();               // load GLTF, extract mesh
  this.applyMaterials();         // attach materials + customDepthMaterial to mesh
  this.scene.add(this.model);
  this.updateMaterials();        // traverse: castShadow, envMapIntensity, needsUpdate
  if (this.debug?.isActive) this.addDebugFolders();
}
```

---

## update() Pattern

```typescript
public update(): void {
  // Standard: update time uniform each frame
  this.material.uniforms.uTime.value = this.time.elapsedSeconds;
}
```

For conditional playback (GUI-toggled):

```typescript
public update(): void {
  if (this.guiRegistry?.state.uTimePlayback) {
    this.customUniforms.uTime.value = this.time.elapsedSeconds;
  }
}
```

---

## destroy() Completeness Checklist

Kill animations first, then dispose GPU resources, then remove from scene, then dispose registry.

```typescript
public destroy(): void {
  // 1. Kill animation timelines / mixers (prevent callbacks after destroy)
  this.slapTimeline?.kill();

  // 2. Dispose registry (cancels pending sessionStorage write)
  this.guiRegistry?.dispose();

  // 3. Dispose GPU resources
  this.geometry.dispose();
  this.material.dispose();
  // OR for GltfEntity:
  this.destroyModel(); // traverses children, disposes geometry + material(s)

  // 4. Remove from scene
  this.scene.remove(this.mesh);
  // OR: this.scene.remove(this.model);
}
```

For entities with multiple meshes (CoffeeSmoke pattern):

```typescript
public destroy(): void {
  this.guiRegistry?.dispose();
  this.destroyModel();
  this.scene.remove(this.model);
  this.smokeGeometry.dispose();
  this.smokeMaterial.dispose();
  this.scene.remove(this.smokeMesh);
}
```

---

## regenerate() Pattern (expensive GUI rebuild)

For entities where GUI changes require full geometry/material replacement:

```typescript
private regenerate(): void {
  this.scene.remove(this.points);
  this.geometry.dispose();
  this.material.dispose();
  this.setGeometry();
  this.setMaterial();
  this.setPoints();
  this.scene.add(this.points);
}

private addDebugFolders(): void {
  const registry = new GUIStateRegistry(...);
  // Apply any sessionStorage-restored values immediately
  this.regenerate();
  // Wire expensive controls to onFinishChange
  folder.add(state, "count").onFinishChange(() => this.regenerate());
}
```

---

## Code-Quality Checklist

- Group related tunable numeric ranges into a single `static readonly CONFIG` object instead of scattering literals through methods — keeps the tunable surface visible at a glance and pairs related values (e.g. `min`/`max`) together.
- Any standalone magic threshold/limit gets a descriptive `static readonly NAME` instead of an inline literal at its call site.
- Every subscription added during setup (`.on(...)`) must have its exact counterpart removal in `destroy()` — when adding a new listener, add its removal in the same pass, don't defer it.
- A small helper that returns an element of an existing array/collection should derive its return type from that collection (`(typeof this.items)[number]`) instead of restating a parallel type that can drift out of sync.
- A single `this.child = new Child(...)` assignment is fine bare in the constructor. The moment a setup step needs more than one statement — construct _and_ apply initial state, construct _and_ register a listener — wrap all of it in its own `setX()`/`configureX()` method, called as one line from the constructor. Never leave multiple raw statements for one conceptual setup step sitting directly in the constructor body.
- When extracting a helper method, give it explicit parameters for whatever it operates on — don't have it implicitly reach for `this.property` / enclosing-scope state that only exists because of when it happens to be called. A zero-parameter method that just reads instance state set immediately before calling it isn't a real extraction, it's the same code split into two places for no reason — merge it back into one method, or make it take the value(s) it needs so it's actually callable with different data.
- Never define a local `const fn = () => {...}` inside a method body to bridge it to some external callback signature (e.g. a GUI library's `bind(key, (value) => void)` firing once per key). If the logic needs to be a callback target, make the logic itself an arrow **class field** and pass it directly — a zero/fewer-parameter function is structurally assignable wherever a callback with more parameters is expected, so `registry.bind("key", this.myMethod)` works with no wrapper needed even if `myMethod` ignores the value `bind()` would hand it. No local function declarations inside method bodies, ever — if something needs to be callable independently, it's a class method, not a nested closure.
- When a `this.property` needs multiple configuration steps before it's ready (constructing it, setting sub-properties, calling an init method), do all of that on a local `const` first and assign to `this.property` only once, fully configured, as the last line:

```typescript
const directionalLightHelper = new DirectionalLightHelper();
directionalLightHelper.setPosition(position);
directionalLightHelper.setColor(color);
this.directionalLightHelper = directionalLightHelper;
```

not

```typescript
this.directionalLightHelper = new DirectionalLightHelper();
this.directionalLightHelper.setPosition(position);
this.directionalLightHelper.setColor(color);
```

Avoids repeating the `this.x.` prefix at every step, and no other code can ever observe `this.property` half-configured mid-setup.
- Never pass `new X(...)` directly as an inline argument to another call. Name it first, then pass the name:

```typescript
const position = new THREE.Vector3(x, y, z);
this.helper.setPosition(position);
```

not

```typescript
this.helper.setPosition(new THREE.Vector3(x, y, z));
```

The call site should read as "call `setPosition` with `position`," not require parsing a nested constructor to see what's being passed.

### Document non-obvious fields

Public options/config/state type fields, and class properties whose purpose isn't obvious from their name+type alone, get a one-line `/** ... */` doc comment describing their _role_ — not a restatement of the type:

```typescript
export type FireworkOptions = {
  /** 3D world position where the burst spawns. */
  position: THREE.Vector3;
  /** Called when the animation completes so the manager can dispose this instance. */
  onComplete: () => void;
};

class Human {
  /** Depth pass material — mirrors the deformation so shadows match the body. */
  private modelShadowMaterial: THREE.MeshDepthMaterial;
  /** GSAP timeline scrubbed by pointer position while the special mode is active. */
  public slapTimeline: gsap.core.Timeline | null = null;
}
```

Skip it for fields where the name+type already say everything (`private geometry: THREE.BufferGeometry` needs no comment).

### Method JSDoc: WHAT only, never WHY/HOW

Constructor params/options and class properties (above) may explain WHY/HOW, that's their job — the caller can't see the implementation, the doc is the only contract they get. Methods are different: the body is right there. A method's `/** ... */` states what it does, nothing more. Reasoning, gotchas, and workarounds go in an inline `? ` comment (comment-prefixes skill) at the exact line they apply to, never stacked into the docblock, even when the reasoning is genuinely important:

```typescript
/** Pads `active` with placeholder lights up to the uniform array's fixed size. */
private padPointLightUniformValues(
  active: PointLightUniformValue[],
): PointLightUniformValue[] {
  /*
    ? uPointLights[MAX_POINT_LIGHTS] in GLSL always allocates the full slot count — Three.js's
    ? uniform uploader writes every slot each frame regardless of uPointLightCount, so .value
    ? must always be exactly MAX_POINT_LIGHTS long or it reads .color off undefined.
  */
  ...
}
```

not

```typescript
/**
 * `uPointLights[MAX_POINT_LIGHTS]` in GLSL always allocates MAX_POINT_LIGHTS uniform slots —
 * Three.js's uniform uploader writes all of them every frame regardless of `uPointLightCount`
 * (that only controls the shader's loop, not the JS-side upload step). `.value` must always be
 * exactly MAX_POINT_LIGHTS long or Three.js reads `.color` off `undefined` for the missing slots.
 */
private padPointLightUniformValues(...): PointLightUniformValue[] { ... }
```

Skip the JSDoc entirely when the method name already says the WHAT (`setPosition`, `destroy`).
