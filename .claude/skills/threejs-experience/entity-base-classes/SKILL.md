---
name: entity-base-classes
description: Use when creating any new World entity class — determines which abstract base class to extend based on whether the entity loads a GLTF, needs external textures, or modifies an embedded material.
metadata:
  type: reference
---

# Entity Base Classes

## Decision Tree

```
Does the entity load a .glb/.gltf file?
  NO  → Does it need textures from Resources?
          NO  → MeshEntity
          YES → TexturedMeshEntity
  YES → Does it replace/augment the GLTF's embedded material?
          NO  → GltfEntity
          YES → TexturedGltfEntity
```

## Examples per class

| Class | Extends | Why |
|---|---|---|
| `Floor` | `MeshEntity` | PlaneGeometry + MeshStandardMaterial, no external assets |
| `ShaderPlane` | `MeshEntity` | PlaneGeometry + ShaderMaterial, no external assets |
| `CoffeeSmoke` | `GltfEntity` | Loads bakedModel.glb, keeps embedded MeshBasicMaterial, adds separate smoke ShaderMaterial mesh |
| `Human` | `TexturedGltfEntity` | Loads human.glb, replaces material via `onBeforeCompile`, loads color/normal textures |

## Contracts per base class

### MeshEntity
- Abstract properties: `geometry`, `material`, `mesh`
- Abstract methods: `setGeometry()`, `setMaterial()`, `setMesh()`
- No built-in destroy — dispose geometry + material manually

### GltfEntity
- Abstract property: `model: GLTF["scene"]`
- Abstract method: `setModel()`
- Concrete method: `destroyModel()` — traverses all children, disposes geometry and material(s) (handles both single material and material array)
- Optional: `animation?: AnimationState<TAnimations>`

### TexturedGltfEntity (extends GltfEntity)
- Additional abstract: `textures`, `material`
- Additional abstract methods: `setTextures()`, `setMaterial()`
- Use when the GLTF's embedded material is replaced or heavily modified at runtime

## Location

`src/modules/World/types/entity.ts`
