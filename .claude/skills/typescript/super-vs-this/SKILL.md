---
name: super-vs-this
description: Use when writing or editing any class that extends another class. Decides when to call an inherited member via super vs this.
metadata:
  type: reference
---

# super vs this

**Rule:** Call an inherited member via `super.` when it's a method, getter, or setter the current class doesn't override. Use `this.` for everything else: own members, inherited fields, and any method the current class (or any class further down the hierarchy) overrides.

```typescript
class DisplacementCanvas extends Canvas2D implements Updatable {
  private readonly resizeObserver: ResizeObserver;

  constructor({ canvas }: Canvas2DConstructor) {
    super({ canvas });

    const { width, height } = this.instance.getBoundingClientRect(); // ✅ this. — instance is a field
    super.setSize(width, height); // ✅ super. — setSize is Canvas2D's, not overridden here
  }

  public drawOnOldPaint(): void {
    this.context.save(); // ✅ this. — context is a field

    super.setCompositeOperation("destination-out"); // ✅ super. — inherited method, not overridden
    super.fillCanvas(`rgba(0, 0, 0, ${this.fadeAlpha})`); // ✅ super. — same

    this.context.restore();
  }

  public destroy(): void {
    this.resizeObserver.disconnect(); // ✅ this. — own field

    super.destroy(); // ✅ super. — this class overrides destroy(), and explicitly wants the base cleanup too
  }
}
```

## Why fields can't use super

A method, getter, or setter is written once onto the class's shared `prototype` object. `super.member` starts its lookup there, one level up the prototype chain, and finds it.

A field (`private x: number`, `public readonly instance: HTMLCanvasElement`, or any `this.x = value` in a constructor) is assigned directly onto the specific instance, never onto any prototype. `super.field` starts looking at the parent's prototype, which never held that value, so it reads `undefined`, regardless of inheritance depth.

```typescript
class A {
  constructor() { this.field = "A-field"; }
  method() { return "A-method"; }
}
class B extends A {
  constructor() {
    super();
    super.field;    // undefined — fields live on the instance, not the prototype
    super.method(); // "A-method" — methods live on the prototype
  }
}
```

There's only ever one object. `super()` in a child constructor runs the parent's constructor body on that same instance, so a field the parent assigns is already sitting on `this` by the time the child continues. There's no separate copy for `super` to reach.

## Why an override breaks the swap

`this.method()` always dispatches to whichever class in the hierarchy actually overrides `method` (virtual dispatch). `super.method()` deliberately skips that and always calls the parent's version. The moment any class overrides an inherited member, every `super.member()` call site that used to be safe starts silently returning the pre-override behavior instead of the real one, with no compiler error. Only convert `this.` to `super.` for members the current class doesn't override, and re-check those call sites if an override is added later.

## Abstract base classes

An `abstract` member has no implementation anywhere, so there's nothing on any prototype for `super` to reach. TypeScript rejects `super.abstractMember()` at compile time. Classes extending a pure-abstract base (e.g. `PointsEntity`) never use `super.` for anything the base declares, only `this.` for the subclass's own implementation.
