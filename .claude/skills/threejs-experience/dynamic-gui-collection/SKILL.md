---
name: dynamic-gui-collection
description: Use when a World entity needs a user-driven, growable/shrinkable collection of sub-entities managed through the debug GUI (add/remove buttons, per-item folders) rather than a fixed count or an event-spawned pool. Covers per-item identity via a monotonic id generator, two-tier persistence (per-item state + the parent's active-id list), and syncing the live collection into a parent-owned derived aggregate.
metadata:
  type: reference
---

# Dynamic GUI Collection

A third composite pattern alongside the Pool and Shared-Resource Group patterns in `composite-entities` — for when the *count itself* is user-controlled at runtime through the debug GUI, not fixed at construction and not driven by scene events.

## When this applies

```
Fixed count decided at construction?           → Shared-resource group pattern (composite-entities)
Spawned/destroyed by a scene event (click, etc)? → Pool pattern (composite-entities)
Added/removed by the user via debug GUI buttons,
  each item needing its own persisted state?     → THIS pattern
```

## The child: owns its own everything

Each item is a real class, not a plain data object — it owns its own `GUIStateRegistry` (own sessionStorage key, keyed by `id`), its own GUI folder, and reports its own removal:

```typescript
type ItemState = {
  color: string;
  value: number;
};

export type ItemEntityParams = {
  id: number;
  parentFolder: GUI;
  defaults: ItemState;
  onChange: () => void;
  onRemove: (self: ItemEntity) => void;
};

class ItemEntity implements Destroyable {
  public readonly id: number;
  private registry: GUIStateRegistry<ItemState>;
  private folder: GUI;
  private readonly onChange: () => void;
  private readonly onRemove: (self: ItemEntity) => void;

  constructor({ id, parentFolder, defaults, onChange, onRemove }: ItemEntityParams) {
    this.id = id;
    this.onChange = onChange;
    this.onRemove = onRemove;

    this.setRegistry(defaults);
    this.setFolder(parentFolder);
    this.addFolderControls();
  }

  private setRegistry(defaults: ItemState): void {
    this.registry = new GUIStateRegistry<ItemState>(`item-${this.id}`, defaults);
  }

  private setFolder(parentFolder: GUI): void {
    this.folder = parentFolder.addFolder(`Item #${this.id}`);
  }

  private addFolderControls(): void {
    const { registry, folder } = this;
    const { state } = registry;

    folder.add(state, "value").min(0).max(1).step(0.001).name("Value");
    registry.bind("value", this.onChange);

    folder.add({ remove: this.handleRemoveClick }, "remove").name("Remove");
  }

  private handleRemoveClick = (): void => {
    this.onRemove(this);
  };

  public destroy(): void {
    this.registry.dispose();
    this.folder.destroy(); // lil-gui API — removes this item's folder from the panel
  }
}
```

`onChange`/`onRemove` are handed in by the parent as its own bound methods — the child never reaches back into the parent directly, it only calls the callbacks it was given.

## The parent: array + id generator + one hosting folder

```typescript
/** Infinite sequence of monotonic ids starting from `start` — `.next().value` reads and advances atomically. */
function* idGenerator(start: number): Generator<number, never> {
  let id = start;
  while (true) {
    yield id;
    id += 1;
  }
}

class CollectionGroup implements Updatable, Destroyable {
  private static readonly STORAGE_KEY = "collection-ids";
  private static readonly DEFAULT_ITEM_STATE: ItemState = { color: "#ffffff", value: 0.5 };

  private items: ItemEntity[] = [];
  private itemIds = idGenerator(0);
  private itemsFolder: GUI | null = null;

  private addItem = (): void => {
    if (!this.itemsFolder) return;

    const entity = new ItemEntity({
      id: this.itemIds.next().value,
      parentFolder: this.itemsFolder,
      defaults: CollectionGroup.DEFAULT_ITEM_STATE,
      onChange: this.syncDerivedState,
      onRemove: this.removeItem,
    });

    this.items.push(entity);
    this.saveIds();
    this.syncDerivedState();
  };

  private removeItem = (entity: ItemEntity): void => {
    entity.destroy();

    const index = this.items.indexOf(entity);
    if (index === -1) return;

    this.items.splice(index, 1);
    this.saveIds();
    this.syncDerivedState();
  };

  private saveIds(): void {
    const ids = this.items.map((item) => item.id);
    WebStorage.setKey(CollectionGroup.STORAGE_KEY, ids, true);
  }

  /** Recreates whichever items were active on last reload (or seeds one default item on first-ever load), then wires the Add button. */
  private restoreItems(): void {
    // ? Only runs when the debug GUI exists to host the per-item folders.
    if (!this.itemsFolder) return;

    const savedIds = WebStorage.getKey<number[]>(CollectionGroup.STORAGE_KEY, true);
    const ids: number[] = savedIds?.length > 0 ? savedIds : [0];

    for (const id of ids) {
      const entity = new ItemEntity({
        id,
        parentFolder: this.itemsFolder,
        defaults: CollectionGroup.DEFAULT_ITEM_STATE,
        onChange: this.syncDerivedState,
        onRemove: this.removeItem,
      });
      this.items.push(entity);
    }

    const nextId = Math.max(...ids) + 1;
    this.itemIds = idGenerator(nextId);

    this.itemsFolder.add({ add: this.addItem }, "add").name("Add Item");

    this.saveIds();
    this.syncDerivedState();
  }

  /** Recomputes whatever the parent derives from the live `items` array (a uniform array, a count, etc). Passed into every child as its change callback. */
  private syncDerivedState = (): void => {
    // ...
  };
}
```

## Gotchas

- **Two-tier persistence, not one.** Each item persists its own field values under its own `GUIStateRegistry` key — that mechanism is unchanged from any single-entity debug folder (see `debug-gui-registry`). The parent separately persists only the *list of active ids* under one dedicated key, and uses it purely to know which items to reconstruct on load. Don't try to fold per-item state into the parent's storage — that's what makes each `ItemEntity` self-contained.
- **Ids are never reused, even after removal.** The id is the suffix of the child's sessionStorage key (`item-${id}`). Reusing a freed id would let a newly added item silently inherit a removed item's stale persisted values from a previous session. The generator only ever counts up; removing an item does not roll it back.
- **Reseeding the generator on load means finding the max of the restored ids, not resetting to 0.** `restoreItems()` must set `itemIds = idGenerator(Math.max(...ids) + 1)` after reconstructing the saved items, or newly-added items after a reload could collide with an id that's still active.
- **`onChange` isn't just a live-preview hook — it's also the parent's resync trigger.** Every item is constructed with the parent's `syncDerivedState` as its `onChange`, so a slider drag on any single item re-derives the parent's aggregate too, not just the item's own visual state.
- **`addItem`/`restoreItems` guard on the hosting folder existing.** The whole feature only exists behind the debug GUI — there's no non-debug fallback collection. The `if (!this.itemsFolder) return` guard is intentional, not a missing initialization bug.
- **If the derived aggregate feeds a fixed-size consumer** (e.g. a GLSL uniform array declared with a compile-time max length), the sync step must pad the aggregate out to that fixed size on every call, independent of how many items are actually active — the consumer doesn't know the collection is variable-length.
