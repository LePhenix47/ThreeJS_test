<claude-mem-context>
# Memory Context

# [threejs-test] recent context, 2026-05-17 5:17pm GMT+2

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 8 obs (3 429t read) | 55 883t work | 94% savings

### May 17, 2026
647 4:58p 🔵 Experience class uses singleton pattern with dependency injection and event-driven architecture
648 4:59p 🔵 Camera class accesses Experience singleton to access shared resources and register lifecycle methods
649 " 🔵 EventEmitter custom implementation enables event-driven architecture for Sizes and Time utilities
650 " 🔵 Time class manages game loop and frame timing via requestAnimationFrame and EventEmitter
651 " 🔵 Sizes class uses ResizeObserver to track canvas dimensions and emit resize events
652 " 🔵 Experience module architecture: singleton orchestrator with EventEmitter-based utilities
S246 Code-structuring lesson: identified initialization order bug in Experience module (May 17, 4:59 PM)
S245 Learn code-structuring patterns for bigger projects by examining Experience module folder (May 17, 4:59 PM)
654 5:03p 🔄 ThreeScene component refactored to use Experience module; removed 200+ lines of duplicated Three.js setup code
653 5:05p 🔵 Three.js Experience Module Architecture: Singleton + Event-Driven Pattern
S247 Code-structuring lesson on larger projects; refactor ThreeScene to use Experience module (May 17, 5:06 PM)
**Investigated**: Experience module (5 TypeScript files: Experience, Camera, Time, Sizes, EventEmitter); project conventions (React, TypeScript, hooks organization); ThreeScene component (original ~313 lines with all Three.js setup)

**Learned**: Experience module demonstrates singleton pattern with event-driven architecture. Separate concerns: EventEmitter base class, Time emits 'tick' events via rAF loop, Sizes tracks canvas dimensions via ResizeObserver, Camera depends on singleton for shared resources. Event-driven decouples components. Module structure (three/ for Three.js, utils/ for reusable) scales well. Identified initialization order bug: Camera instantiated before Sizes in Experience constructor, but Camera reads sizes.aspectRatio at init time.

**Completed**: Experience module code review with detailed observations on singleton pattern, event system, and lifecycle management. ThreeScene component refactored: removed all manual scene/camera/renderer/controls/helpers/GUI setup code, removed state persistence logic, removed animation frame management. Component now delegates to Experience singleton. Reduced from ~313 lines to ~46 lines. Only createLoadingManager retained (texture loading responsibility).

**Next Steps**: Session trajectory complete for code-structuring lesson. If continuing: apply same patterns to other components, fix initialization order bug in Experience constructor (move Sizes before Camera instantiation), verify ThreeScene renders correctly with refactored Experience setup.


Access 56k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>