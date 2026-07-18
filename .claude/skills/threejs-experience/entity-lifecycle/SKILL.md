---
name: entity-lifecycle
description: Use when writing any World entity class — covers the Experience sub-system getter pattern, constructor method ordering per entity type, update() pattern, and destroy() completeness checklist.
metadata:
  type: reference
---

# Entity Lifecycle

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
public update = (): void => {
  // Standard: update time uniform each frame
  this.material.uniforms.uTime.value = this.time.elapsedSeconds;
};
```

For conditional playback (GUI-toggled):
```typescript
public update = (): void => {
  if (this.guiRegistry?.state.uTimePlayback) {
    this.customUniforms.uTime.value = this.time.elapsedSeconds;
  }
};
```

---

## destroy() Completeness Checklist

Kill animations first, then dispose GPU resources, then remove from scene, then dispose registry.

```typescript
public destroy = (): void => {
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
};
```

For entities with multiple meshes (CoffeeSmoke pattern):
```typescript
public destroy = (): void => {
  this.guiRegistry?.dispose();
  this.destroyModel();
  this.scene.remove(this.model);
  this.smokeGeometry.dispose();
  this.smokeMaterial.dispose();
  this.scene.remove(this.smokeMesh);
};
```

---

## regenerate() Pattern (expensive GUI rebuild)

For entities where GUI changes require full geometry/material replacement:

```typescript
private regenerate = (): void => {
  this.scene.remove(this.points);
  this.geometry.dispose();
  this.material.dispose();
  this.setGeometry();
  this.setMaterial();
  this.setPoints();
  this.scene.add(this.points);
};

private addDebugFolders = (): void => {
  const registry = new GUIStateRegistry(...);
  // Apply any sessionStorage-restored values immediately
  this.regenerate();
  // Wire expensive controls to onFinishChange
  folder.add(state, "count").onFinishChange(() => this.regenerate());
};
```
