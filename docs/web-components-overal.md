#Architecture for a PixiJS-based engine dashboard built as Web Components.

Clear blueprint with decisions, data flow, and performance patterns—no code.
High-level shape
<App shell / page>
└─ <engine-dash> (composition/root WC)
├─ <engine-gauge id="speed"> (Pixi app #1)
├─ <engine-gauge id="rpm"> (Pixi app #2)
├─ <engine-temp> (Pixi app #3)
├─ <engine-fuel> (Pixi app #4)
└─ <engine-leds> / <engine-odometer> / <engine-shift>

One instrument = one Web Component = one Pixi Application. Enables isolation, easy reuse, independent lifecycles.

<engine-dash> only orchestrates layout + wiring (store/bus/theme), not drawing.

##Responsibilities & contracts
Each instrument WC

Owns: Pixi Application, resize handling, DPR scaling, render loop (ticker), hit areas (if interactive).

Inputs: Attributes (static config), Properties (live values), optional store prop (observable).

Outputs: CustomEvents for user interaction (e.g., needle:drag, value:changed).

Lifecycle: connectedCallback → init Pixi; disconnectedCallback → dispose & unmount.

Root <engine-dash>

Dependency injection: passes a typed store (MobX/Zustand/Rx), or attaches event bus.

Layout (CSS Grid/Flex inside shadow root).

Theming boundary (CSS custom properties and/or theme JSON passed down).

##Data flow & update strategy
Configuration (rarely changes): via attributes (min, max, start-deg, ticks, label…), reflected for debug/DevTools.

Live values (frequent): via properties (value, warning, etc.) or store binding. Avoid attribute churn for hot paths.

Events: instruments emit CustomEvents; root or host app handles behavior/logic.

Rendering pipeline (inside each instrument)
Layering

Static layer (background ring, tick marks, static labels) → cached; re-render only on size/theme/config change.

Dynamic layer (needle, progress arc, warning markers) → re-render on value change.

Text layer (value readout, label) → split: static vs dynamic labels.

Dirty flags

needsStaticRedraw: set when size/theme/config changed.

needsDynamicRedraw: set when value changed.

Ticker tick: if neither true → skip drawing work (cheap frame).

Smoothing

Internal displayValue follows external value via exponential smoothing / critically-damped spring.

Mark dynamic dirty only while displayValue !== value.

##Sizing, layout, and DPI
ResizeObserver inside each WC to recompute geometry on container size.

DevicePixelRatio aware: set Pixi resolution = window.devicePixelRatio (or cap to 2).

Geometry derives from container bounds (no fixed pixels). Keep aspect-ratio with CSS if needed.

Theming
CSS Custom Properties on the host (work inside shadow DOM): --g-bg, --g-ring, --g-tick, --g-text, --g-accent, --g-needle, etc.

Optional theme JSON: pass via property; instrument maps tokens → colors/line widths. Changes trigger static redraw.

State management options (choose one)
Direct props: parent sets el.value = store.speed. Simple, decoupled.

Store injection: el.store = dashboardStore. WC subscribes internally (e.g., MobX reaction coalesced to rAF).

Event bus: instruments listen to value:update events on root; good for non-framework hosts.

For your stack: #2 (store injection) for hot signals + #1 for occasional one-offs is a sweet spot.
Performance tactics (important)
Batch work per frame: coalesce external updates; write graphics only in rAF/ticker.

Cache static graphics: precompute tick positions; use Graphics once, avoid per-frame .clear() when possible—only when dirty.

Text cost control: reuse Text objects; only update when content/size changes. For heavy labels → BitmapText or sprite atlas (later).

Minimal overdraw: prefer strokes; avoid large translucent fills stacking.

Avoid cross-WC coupling: each Pixi app renders to its own canvas—keeps state small and GC straightforward.

##Accessibility & semantics
Each instrument exposes an ARIA live value in its shadow DOM (e.g., visually hidden <output aria-live="polite"> mirroring value).

Keyboard interactions (if any) emit semantic events; host decides behavior.

Error handling & telemetry
Instruments guard against invalid inputs (NaN/∞/out of range) and clamp.

Optional dev mode: draw a tiny FPS, show dirty flags, warn on layout thrash.

Root can listen for instrument:error events and surface a minimal UI notice.

##Testing & profiling
Unit: geometry helpers, angle mapping, value → displayValue easing.

Visual regression: render to offscreen canvas (or node-canvas) with fixed seed + compare PNGs.

Perf: record long runs with 60→120 Hz tick; track % of frames with any draw; measure max frame time; ensure static idle is ~0 work.

##Packaging & composition
Publish instruments as standalone WCs (no global CSS), versioned; root dash imports them.

Keep Pixi peer—avoid bundling multiple versions.

Provide a minimal design tokens doc (CSS vars) and attribute/property tables.

##Decision checklist (quick answers)
One Pixi app per instrument or one global? → Per instrument. Isolation > marginal savings; simpler lifecycles.

Attributes vs properties for hot values? → Properties. Reflect only important config to attributes.

Smoothing? → Yes; internal displayValue with exp or spring; mark-dirty until converged.

MobX wiring? → Inject store; subscribe with rAF coalescing; dispose on disconnect.

Responsiveness? → ResizeObserver + DPR scaling; geometry from bounds; optional CSS aspect-ratio.

Theming? → CSS custom properties first; optional JSON theme for non-CSS hosts.
