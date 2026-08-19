---
name: composite-entities
description: Use when a World entity is actually composed of multiple sub-entities. A dynamically spawned/destroyed pool of same-shaped instances, or a fixed set of different entities that must share state (like one material) and render as a coordinated whole. Covers ownership rules for shared resources and how the parent coordinates children's lifecycle and per-frame updates.
metadata:
  type: reference
---

# Composite Entities

## Decision

```
Multiple same-shaped instances created/destroyed dynamically (spawned on an event)?
  YES → Pool pattern

Fixed set of different entities that must share state/materials and render as one whole?
  YES → Shared-resource group pattern
```

---

## Pool Pattern

For a dynamically-growing/shrinking set of same-shaped instances (e.g. spawned-on-click effects). A plain manager class. Not itself geometry/mesh-owning. Implements `Updatable` + `Destroyable`, holds an `active: T[]` array, and creates instances in response to events.

```typescript
class EffectPool implements Updatable, Destroyable {
  private readonly active: Effect[] = [];

  private spawn(position: THREE.Vector3): void {
    const effect = new Effect({
      position,
      onComplete: () => this.remove(effect), // instance reports its own completion
    });
    this.active.push(effect);
  }

  private remove(effect: Effect): void {
    effect.destroy();
    const index = this.active.indexOf(effect);
    if (index === -1) return;
    this.active.splice(index, 1);
  }

  public update(): void {
    for (const effect of this.active) effect.updateTime();
  }

  public destroy(): void {
    for (const effect of this.active) effect.destroy();
    this.active.length = 0;
  }
}
```

Key rule: the manager passes an `onComplete` callback into each instance's constructor so the instance reports its own completion, rather than the manager polling state every frame to figure out what finished.

---

## Shared-Resource Group Pattern

For a small, fixed set of *different* sub-entities that must render as one coordinated whole (e.g. sharing one material so they visually read as a single object).

```typescript
export type GroupEntityParams = {
  material: THREE.ShaderMaterial;
  group: THREE.Group;
};

class CompositeGroup implements Updatable, Destroyable {
  private material: THREE.ShaderMaterial;
  public group: THREE.Group;
  private partA: PartA;
  private partB: PartB;

  constructor() {
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.setMaterial(); // parent creates the shared resource

    const { material, group } = this;
    this.partA = new PartA({ material, group });
    this.partB = new PartB({ material, group });
  }

  public update(): void {
    const t = this.time.elapsedSeconds;
    this.partA.setRotation(t); // parent drives children through bespoke methods
    this.partB.setRotation(t); // not a generic child.update()
  }

  public destroy(): void {
    this.partA.destroy();
    this.partB.destroy();
    this.material.dispose(); // parent disposes what it created. Once
    this.scene.remove(this.group);
  }
}

class PartA extends MeshEntity {
  private material: THREE.ShaderMaterial;

  constructor({ material, group }: GroupEntityParams) {
    super();
    this.material = material; // received by reference, not owned
    this.setGeometry();
    group.add(this.mesh);
  }

  protected setMaterial = (): void => {
    // Material provided externally by the parent group. Intentional no-op.
  };

  public destroy(): void {
    this.geometry.dispose();
    // Do NOT dispose this.material. The parent owns it.
  }
}
```

Parent owns the shared resource(s) and injects them into each child's constructor as a params object; children attach to the parent's `THREE.Group`, not the scene. Parent coordinates children's per-frame behavior through purpose-built methods rather than a generic `update()`.

---

## Gotchas

- A shared-resource child's `setMaterial()` (or whichever `setX()` owns the resource in `MeshEntity`'s contract) is legitimately a no-op. Don't "fix" it into constructing its own material.
- Whichever entity **creates** a shared resource is the only one that **disposes** it. A child's `destroy()` must not dispose a resource it received by reference.
- A pool instance's `destroy()` gets called from its own `onComplete` callback, not from the manager reaching in. Don't assume the manager always initiates removal.
- Gating can be mixed inside one composite: some children built eagerly in the parent constructor, others gated behind `resources.on("textures-loaded")` in the same constructor, when only some children need external assets. See the `resources-gate` skill.
