---
name: debug-gui-registry
description: Use when adding any lil-gui debug controls to a World entity — covers the GUIStateRegistry pattern, bind vs bindFinal, and cleanup.
metadata:
  type: reference
---

# Debug GUI Registry

## Full Pattern

```typescript
import GUIStateRegistry from "@/utils/classes/gui-state-registry";

// 1. State type — primitive values only (string | number | boolean)
type MyEntityState = {
  wireframe: boolean;
  color: string;
  subdivisions: number;
};

class MyEntity {
  // 2. Registry property — null until debug is active
  private guiRegistry: GUIStateRegistry<MyEntityState> | null = null;

  // 3. Defaults — also used to seed setGeometry/setMaterial initial values
  private readonly debugDefaults: MyEntityState = {
    wireframe: false,
    color: "#777777",
    subdivisions: 1,
  };

  private get debug() { return this.experience!.debug; }

  constructor() {
    // ... geometry/material/mesh setup reads from debugDefaults ...
    this.scene.add(this.mesh);
    if (this.debug?.isActive) this.addDebugFolders();
  }

  protected setMaterial = () => {
    // 4. Destructure debugDefaults to seed initial material state
    const { wireframe, color } = this.debugDefaults;
    this.material = new THREE.MeshStandardMaterial({ wireframe, color });
  };

  private addDebugFolders = () => {
    // 5. Instantiate with unique storage key
    const registry = new GUIStateRegistry<MyEntityState>(
      "my-entity-gui-state",  // must be unique per entity
      this.debugDefaults,
    );
    this.guiRegistry = registry;
    const { state } = registry;
    const { gui } = this.debug;

    const folder = gui.addFolder("My Entity");

    // 6a. Live/cheap updates: gui.add → registry.bind (fires immediately + on every change)
    folder.add(state, "wireframe").name("Wireframe");
    registry.bind("wireframe", (v) => { this.material.wireframe = v; });

    folder.addColor(state, "color").name("Color");
    registry.bind("color", (v) => { this.material.color.set(v); });

    // 6b. Expensive updates (geometry rebuild): gui.add → bindFinal → onFinishChange
    folder.add(state, "subdivisions").step(1).min(1).max(100).name("Subdivisions")
      .onFinishChange(
        registry.bindFinal("subdivisions", (v) => {
          this.mesh.geometry.dispose();
          this.mesh.geometry = new THREE.PlaneGeometry(SIZE, SIZE, v, v);
        })
      );
  };

  public destroy = () => {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
    this.guiRegistry?.dispose(); // 7. Always dispose — cancels pending sessionStorage write
  };
}
```

## bind vs bindFinal

| | `bind(key, cb)` | `bindFinal(key, cb)` |
|---|---|---|
| Fires on drag | Yes | No |
| Fires on init | Yes (applies sessionStorage restore) | Yes |
| Use for | Cheap per-frame updates (material props) | Expensive ops (geometry rebuild, shader recompile) |
| How to wire | `registry.bind(key, cb)` after `gui.add()` | Pass return value to `.onFinishChange()` |

## Rules

- `gui.add(state, key)` then `registry.bind(key, cb)` — always in this order
- Storage key must be unique per entity (`"floor-gui-state"`, `"coffee-smoke-gui-state"`, etc.)
- State type values must be primitives — no objects, no arrays
- `guiRegistry` always initialized to `null`, set inside `addDebugFolders`
- Dispose with `this.guiRegistry?.dispose()` in `destroy()`

## Folder uniform update pattern (for ShaderMaterial uniforms via GUI)

```typescript
folder.add(state, "size").min(0.01).max(10).step(0.001).name("Size");
registry.bind("size", (v) => {
  this.material.uniforms.uSize.value = v * this.renderer.rendererPixelRatio;
});
```
