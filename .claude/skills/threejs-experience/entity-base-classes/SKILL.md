---
name: entity-base-classes
description: Use when creating any new World entity class — determines which abstract base class to extend based on whether the entity loads a GLTF, needs external textures, modifies an embedded material, renders as THREE.Points instead of a Mesh, or owns the scene environment map.
metadata:
  type: reference
---

# Entity Base Classes

## Decision Tree

```
Does the entity own the scene environment map (scene.background / scene.environment)?
  YES → EnvironmentEntity

Does the entity render as THREE.Points instead of a Mesh?
  YES → Does it need an isolated debug-preview point to inspect the fragment
        shader in isolation (oversized point size, hidden by default)?
          NO  → PointsEntity
          YES → PreviewablePointsEntity (extends PointsEntity)

Otherwise, it renders as a THREE.Mesh:
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
| `Firework` | `PointsEntity` | Particle burst — geometry + ShaderMaterial + `THREE.Points`, no mesh |
| `Galaxy` | `PreviewablePointsEntity` | Particle field with a hidden oversized debug point to preview the fragment shader in isolation |
| `Environment` | `EnvironmentEntity` | Owns `scene.background`/`scene.environment`, sun light, helpers |

## Contracts per base class

### MeshEntity
- Abstract properties: `geometry`, `material`, `mesh`
- Abstract methods: `setGeometry()`, `setMaterial()`, `setMesh()`
- No built-in destroy — dispose geometry + material manually

### PointsEntity
- Same shape as `MeshEntity` but the render object is `THREE.Points`, not `THREE.Mesh`
- Abstract properties: `geometry`, `material: PointsMaterial | RawShaderMaterial | ShaderMaterial`, `points`
- Abstract methods: `setGeometry()`, `setMaterial()`, `setPoints()`
- Use for any particle-system entity

### PreviewablePointsEntity (extends PointsEntity)
- Additional abstract properties: `previewGeometry`, `previewMaterial`, `previewPoint` — all nullable, only built when debug is active
- Additional abstract methods: `setPreviewGeometry()`, `setPreviewMaterial()`, `setPreviewPoints()`, `destroyPreview()`
- Use when a particle shader's per-pixel look is hard to inspect at normal point size — the preview point renders oversized and starts hidden, toggled via its own GUI folder

### GltfEntity
- Abstract property: `model: GLTF["scene"]`
- Abstract method: `setModel()`
- Concrete method: `destroyModel(disposeMaterial = true)` — traverses all children, disposes geometry and (unless told not to) material(s) (handles both single material and material array). Pass `false` when `material` was assigned by reference from an external owner — e.g. a `composite-entities` shared-resource group — so the owner disposes it exactly once instead of the child double-disposing it.
- Optional: `animation?: AnimationState<TAnimations>`

### TexturedGltfEntity (extends GltfEntity)
- Additional abstract: `textures`, `material`
- Additional abstract methods: `setTextures()`, `setMaterial()`
- Use when the GLTF's embedded material is replaced or heavily modified at runtime

### EnvironmentEntity
- Abstract properties: `envMapTexture: THREE.Texture | THREE.CubeTexture | null`, `envMapConfig` (subset of scene env props — blurriness, intensity, rotation X/Y/Z)
- Abstract methods: `setEnvMap()`, `updateMaterial()` — `updateMaterial()` may legally be a no-op if nothing needs a per-material env update
- Use for the one entity responsible for `scene.background`/`scene.environment`

## Location

`src/modules/World/types/entity.ts`
