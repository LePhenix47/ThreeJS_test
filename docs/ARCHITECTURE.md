# Architecture

## Overview

The 3D engine is structured as a **singleton orchestrator** (`Experience`) that owns all sub-modules. React mounts the canvas and creates the `Experience` instance — after that, the 3D world manages its own lifecycle independently.

## Module Structure

```
src/modules/
├── Experience/
│   ├── Experience.ts           # Singleton orchestrator
│   ├── three/
│   │   ├── Camera.ts           # PerspectiveCamera + OrbitControls
│   │   └── Renderer.ts         # WebGLRenderer
│   ├── utils/
│   │   ├── EventEmitter.ts     # Custom event system base class
│   │   ├── Sizes.ts            # Canvas/container dimensions (ResizeObserver)
│   │   ├── Time.ts             # rAF game loop + frame timing
│   │   └── Resources/
│   │       ├── Resources.ts    # Asset loader (textures, GLTF, HDR)
│   │       └── types.ts        # Zod schemas + inferred TS types for sources
│   └── sources/
│       └── textures/           # Source definitions (name, type, paths)
└── World/
    ├── World.ts                # Scene content orchestrator
    └── Environment.ts          # Lighting + environment map
```

## Initialization Order

Order matters — sub-modules access `Experience.instance` in their constructors.

```
Experience constructor
  1. initCanvas()           — resolve HTMLCanvasElement
  2. setDebugMode()         — expose instance on window if debug
  3. Sizes                  — reads parent.clientWidth/clientHeight
  4. Time                   — starts rAF loop
  5. Resources              — sets up loaders, starts loading assets
  6. THREE.Scene
  7. Camera                 — reads sizes.aspectRatio
  8. Renderer               — reads sizes, scene, camera
  9. World                  — listens for "textures-loaded", then builds scene content
```

## Event Flow

### Resize

```
ResizeObserver (parent element)
  → Sizes.emit("resize")
    → Experience.resize()
      → Camera.resize()
      → Renderer.resize()
```

### Tick (every frame)

```
requestAnimationFrame
  → Time.tick()
    → Time.emit("tick")
      → Experience.update()
        → Camera.update()     (controls.update)
        → Renderer.update()   (renderer.render)
```

### Resource Loading

```
THREE.LoadingManager
  → onLoad fires when all assets finish
    → Resources.emit("textures-loaded")
      → World creates Environment
        → Environment applies env map, adds lights
```

## Destroy / Cleanup

`Experience.destroy()` is called from React's `useEffect` cleanup:

```
Experience.destroy()
  → sizes.destroy()       (ResizeObserver.disconnect)
  → time.destroy()        (cancelAnimationFrame)
  → camera.destroy()      (controls.dispose + persistence cleanup)
  → renderer.destroy()    (renderer.dispose)
  → Experience.instance = null
```
