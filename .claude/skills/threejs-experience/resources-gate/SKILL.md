---
name: resources-gate
description: Use when adding or constructing any World entity in World.ts — determines whether to gate construction behind the resources event or build directly in the constructor.
metadata:
  type: reference
---

# Resources Gate

## Rule

**Entity uses external assets (GLTF, textures via `Resources`)?**
→ Construct inside `resources.on("textures-loaded", callback)` in `World.ts`

**Entity is pure geometry/shader with NO external assets?**
→ Construct directly in `World` constructor

## Evidence from branches

| Branch | Entities | Pattern |
|---|---|---|
| `code-structuring-for-bigger-projects` | Fox (GLTF), Floor (textures), Environment | All inside gate |
| `shader-modified-materials` | Human (GLTF + textures), Floor, Environment | All inside gate |
| `shader-coffee-smoke` | CoffeeSmoke (GLTF + perlin texture) | Inside gate |
| `shader-galaxy` | Galaxy (pure BufferGeometry, no assets) | Direct construction |
| `shader-patterns` | ShaderPlane (pure ShaderMaterial, no assets) | Direct construction |
| `template-advanced` | Floor + Environment (no Resources used) | Direct construction |

## Pattern

```typescript
// World.ts constructor
private get resources() { return this.experience!.resources; }

constructor() {
  this.experience = Experience.instance;
  if (!this.experience) throw new Error("Experience instance not found");

  // Entities with external assets — wait for ALL resources to load
  this.resources.on("textures-loaded", () => {
    this.floor = new Floor();
    this.fox = new Fox();
    this.environment = new Environment(); // ORDER MATTERS — env last if it applies env map
  });

  // Entities with no external assets — safe to construct immediately
  this.shaderPlane = new ShaderPlane();
}
```

## Key facts

- `"textures-loaded"` is the **only** event Resources emits. The name is a misnomer — it fires when ALL resource types finish loading (GLTFs, textures, cube textures, HDR). There is no separate `"gltfs-loaded"`.
- Resources starts loading in its constructor (before World is created). The `"textures-loaded"` listener registered in `World` constructor is always registered before the event fires — safe ordering guaranteed.
- Entity properties that are gated must be typed as optional: `public floor?: Floor`. Update and destroy must use optional chaining: `this.floor?.update()`, `this.floor?.destroy()`.
