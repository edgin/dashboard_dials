#Web-components docs

## Distance Tracker Component

DistanceTrackerElement (custom element: <distance-tracker>)

---

What it is:
A Web Component that shows two live values—`speed` and `distance`—inside a Shadow DOM UI.
It supports BOTH declarative (attributes) and imperative (properties via ref) APIs:

      • Attribute usage:
          <distance-tracker speed="47" distance="1234"></distance-tracker>

      • Property usage (recommended for live/fast updates):
          const el = document.querySelector('distance-tracker')!;
          el.speed = 47;
          el.distance = 1234;

How it works (top → bottom):

1. observedAttributes():

   - Returns ["distance", "speed"], telling the platform to notify when these attributes change.
   - When they do, attributeChangedCallback(...) is invoked.

2. Shadow DOM:

   - `this.attachShadow({ mode: "open" })` creates an OPEN shadow root at construction.
     All markup/styles are scoped to `this.shadowRoot`, isolating the component’s UI
     from page CSS and making styling predictable.

3. Internal state:

   - `_distance` and `_speed` hold numeric state used by render().
   - `_reflecting` is a reentrancy guard used to avoid loops when reflecting properties back to attributes.

4. connectedCallback():

   - Lifecycle hook that runs when the element is inserted into the DOM.
   - Reads initial `distance` and `speed` from attributes (if present), coerces them to numbers,
     initializes internal state, and calls render() once for the initial paint.

5. attributeChangedCallback(name, \_oldV, newV):

   - Runs whenever an observed attribute changes (either user edits in HTML or programmatic setAttribute).
   - Coerces `newV` to a number (defaults to 0 if falsy), and if it differs from current internal state,
     updates the corresponding field and re-renders.
   - This is the central path for attribute-driven synchronization.

6. Public API (properties): get/set distance, get/set speed

   - Getters simply return the current internal values.
   - Setters accept any value, coerce to Number, and validate finiteness.
   - If the value changes:
     • The internal field is updated.
     • The component **reflects** the numeric value back to the attribute
     (helps with devtools, SSR/hydration, and attribute-driven consumers).
     • Then render() is called to update the UI.

     Notes on reflection in this implementation:

     - `distance` setter: updates `_distance`, reflects (if different), then render().
     - `speed` setter: same idea, but it uses `_reflecting` to avoid potential re-entry
       if attributeChangedCallback triggers during reflection.
     - Because attributeChangedCallback also updates state and calls render(),
       the reentrancy guard ensures we don’t accidentally cause a nested attribute → setter loop.

7. render():
   - Replaces the shadow DOM contents with a template string containing style and markup.
   - Shows `speed` (km/h) and `distance` (km) with basic layout and typography.
   - Called after initial connect and after any accepted state change.

Usage guidance:
• For **frequent/real-time updates** (e.g., 60fps), prefer property assignment via refs:
el.speed = number; el.distance = number;
This avoids attribute string conversions and DOM attribute mutation overhead.
• Attributes are great for **initial configuration** or occasional updates.

Design trade-offs / improvements to consider:
• Coalescing renders:
If both `speed` and `distance` are updated in quick succession, you may render twice.
You can coalesce updates (e.g., schedule `render()` in a microtask / rAF, or only render once
per tick) to reduce work under heavy load.

    • Reflection consistency:
        You already guard re-entrancy for `speed`. Consider using the same `_reflecting` pattern
        for `distance` to make both setters symmetrical, or choose a single strategy:
          - either (A) reflect property → attribute and let attributeChangedCallback centralize updates,
          - or (B) directly update internal state in the setter and skip setAttribute() for high-frequency paths.

    • Parsing/validation:
        Currently `Number(newV ?? 0) || 0` treats non-numeric/NaN as `0`. If 0 is a meaningful value,
        you might prefer explicit NaN handling (e.g., ignore changes or clamp to min/max).

    • Rendering approach:
        Replacing `innerHTML` is simple but not the most performant. For even smoother updates,
        keep a stable DOM subtree (e.g., cache text nodes in `connectedCallback`) and update only
        `textContent` of those nodes in render(). This reduces garbage collection and layout work.

    • Styling / sizing:
        Since styles are in Shadow DOM, consider exposing CSS custom properties at `:host`
        (e.g., `--distance-color`, `--speed-color`) so consumers can theme without piercing the shadow.

TL;DR:
<distance-tracker> keeps `speed` and `distance` in internal numeric state, renders them in a Shadow DOM
template, and stays in sync with both attributes and properties. For live dashboards, set properties via refs
(fast path). Attribute reflection is helpful for tooling and declarative usage, but consider coalescing renders
and unifying the reflection strategy if you push this component under heavy frame-by-frame updates.

## Engine-power Component

EngingePowerElement (custom element: <engine-power>)

---

What it is:
A simple Web Component that displays a numeric "power" value and re-renders whenever
that value changes. It supports BOTH:
• Attribute-based updates: <engine-power power="42"></engine-power>
• Property-based updates: const el = document.querySelector('engine-power')!; el.power = 42; 1) Property (ref) driven: ref.current.power = 42 - How: In JS/TS, set the class property via a ref (or direct element var). - Pros:
• Type-safe (v: number), no string→number conversions
• Fast: skips attribute mutation & attributeChangedCallback
• Great for app-internal/stateful updates (MobX/React). - Cons:
• Value not visible in HTML attributes (harder to inspect in DevTools)
• Not declarative/SSR-friendly (can’t prefill in static HTML)

      2) Attribute driven:  <engine-power power="42">
        - How: Author sets HTML attribute; component reads it via
                attributeChangedCallback("power", old, new).
        - Pros:
          • Declarative & SSR-friendly; initial value shows up in HTML
          • Easy to test & tweak from DevTools/Storybook
          • Plays nicely with non-JS templating & CMSs
        - Cons:
          • Attribute values are strings → need Number(...) parsing/validation
          • Slightly more overhead (DOM attr change + callback)

      Recommended: HYBRID
      - Accept both .power (property) and power="…" (attribute).
      - Internally guard against feedback loops: only reflect when the
        canonical internal value actually changes.
      - If your app mostly uses refs, prefer property-only during hot paths,
      and reflect to attribute only when you want inspectability.

How it works (key pieces, top to bottom):

1. observedAttributes():

   - Declares which attributes should be watched for changes by the platform.
   - Here it returns ["power"], meaning when the 'power' attribute changes,
     attributeChangedCallback(...) will run.

2. Shadow DOM setup:

   - The field `private root = this.attachShadow({ mode: "open" });` creates an OPEN shadow root
     as soon as the instance is constructed. All rendering (markup + styles) is scoped inside
     this.shadowRoot so page-wide CSS doesn't accidentally affect it (and vice versa).
   - "open" means external code can access el.shadowRoot for debugging/testing.

3. Internal state:

   - `_power` holds the current numeric value. This is the single source of truth used by render().
   - The public getter/setter `power` exposes a typed property API on the element.

4. Lifecycle: connectedCallback():

   - Runs when the element is inserted into the DOM.
   - Reads the initial "power" attribute (if present), converts it to a number, stores it in \_power,
     and calls render() to paint the UI for the first time.
   - Note: If the attribute wasn’t present, it defaults to 0.

5. attributeChangedCallback(name, oldV, newV):

   - Runs whenever an observed attribute changes (including programmatic changes via setAttribute()).
   - Filters for 'power' and ignores no-op changes (oldV === newV).
   - Converts the new value to a number (Number(newV) || 0), updates \_power, and re-renders.
   - This is the main path for attribute-driven updates.

6. Public API (property): get/set power

   - Getter returns the current numeric \_power.
   - Setter accepts any value, coerces to Number, validates it, and—IMPORTANTLY—calls
     setAttribute('power', String(n)) instead of directly mutating \_power.
     Why? This design "reflects" property changes back to the attribute so both stay in sync,
     and it centralizes the actual state update in attributeChangedCallback().
     That means the flow is: property set -> attribute change -> attributeChangedCallback -> \_power + render().
   - This reflection pattern is handy for tooling/devtools (you can see current value in HTML),
     but it does involve an attribute write per update.

7. render():
   - Replaces the entire shadow DOM content with a small template that includes:
     • Scoped styles for the host element
     • A display of the current \_power value
   - Called after initial connect and after every accepted change to \_power.

Usage patterns:
HTML (attribute-driven):
<engine-power power="75"></engine-power>

    JS (property-driven):
      const el = document.querySelector('engine-power')!;
      el.power = 90;        // triggers setAttribute -> attributeChangedCallback -> render()

Design trade-offs / notes:
• Attribute reflection (property -> attribute) is convenient for debugging and declarative usage,
but attributes are strings and involve DOM mutation. For high-frequency updates (e.g., 60fps),
a direct property-to-state update (without setAttribute) is more performant. If you want that,
you can change the setter to assign \_power and call render() directly, skipping setAttribute().
• The component currently coerces invalid/NaN inputs to 0 via `Number(v) || 0` in the attribute path.
Consider whether you want to reject NaN, clamp, or handle negatives differently.
• The class name has a small typo ("Enginge" vs "Engine"), but that doesn’t affect runtime
since the tag name is what matters (`customElements.define("engine-power", ...)`).
• Exporting an empty module (`export {}`) ensures TypeScript treats the file as a module and
doesn’t leak declarations into the global scope.

TL;DR:
This component binds a numeric 'power' value to a Shadow DOM UI. It accepts updates from either
attributes or properties, reflects property changes to attributes for consistency, and re-renders
on every change. For heavy real-time updates, prefer setting the `.power` property directly from
your app (e.g., via a React ref) to avoid attribute churn.

## Speedometer Component

EngineSpeedElement (custom element: <engine-speed>)

---

Purpose:
A self-contained PixiJS speedometer gauge that animates a needle and a progress arc
based on a numeric "speed" value. It can be driven by:
• Attribute updates: <engine-speed speed="45"></engine-speed>
• Property updates: el.speed = 45
• A MobX store: el.store = { speed: number } (reaction-coalesced to rAF)

High-level flow: 1) Shadow DOM + wrapper div are created so Pixi can size to the element. 2) A Pixi Application is initialized (async .init) with `resizeTo: wrapper`, then its canvas
is appended into the shadow root. 3) Static gauge graphics (arc, tick marks, labels, center dot) are drawn once. 4) The component maintains two angles: - currentAngle: what the needle is currently showing - targetAngle: angle mapped from the desired speed (min..max -> minDeg..maxDeg)
On every Pixi ticker frame, currentAngle eases toward targetAngle, and the needle/progress
visuals are redrawn accordingly. 5) The speed can change via: - attributeChangedCallback('speed', …) - property setter: el.speed = n (reflects to attribute) - a MobX `store` property; a reaction reads store.speed and schedules one update per frame

Key properties and ranges: - \_min/\_max: numeric speed range (0..130 by default) - minDeg/maxDeg: dial sweep in degrees (-220..40) => large arc, like a car speedometer - currentAngle/targetAngle: internal angles in radians; the ticker interpolates current -> target - \_speed: current numeric speed cached on the element (also for initial attribute read)

Lifecycle:
• connectedCallback(): - Injects styles and wrapper markup into the shadow root. - Reads initial `speed` attribute (if present). - Creates and initializes Pixi Application (transparent, antialiased, auto-resize to wrapper). - Builds the gauge (graphics, ticks, labels) once. - Sets initial target angle from \_speed. - Starts Pixi ticker: on each frame, ease currentAngle toward targetAngle, then
call #updateProgressArc and #updateNeedle to redraw moving parts.
• disconnectedCallback(): - Disposes the MobX reaction (if any) and destroys the Pixi app (freeing GPU/CPU resources).

Attribute/property sync:
• observedAttributes = ["speed"] → attributeChangedCallback updates \_speed and targetAngle.
• getter/setter `speed`: - setter coerces to Number, early-returns on NaN or no-change, then reflects via setAttribute,
which routes through attributeChangedCallback (centralizing the state update).
Note: For very high-frequency updates, direct state update in the setter (without reflecting)
is slightly more efficient. Here, attribute reflection helps debugging/devtools.

MobX store binding (set store = { speed }):
• #bindToStore(s): - Disposes any previous reaction. - If provided, creates a reaction on s.speed. - Coalesces updates to once per animation frame via requestAnimationFrame:
reaction → schedule (if not already scheduled) → on next frame: #setTargetFromSpeed(value)
This avoids redundant per-change work when speed updates occur faster than the display.

Drawing & geometry:
• #buildGauge(): - Creates Graphics objects for the static arc, the dynamic needle, center dot, and progressArc,
adds them to the Pixi stage, and calls #drawStatic().
• #drawStatic(): - Calculates center (cx, cy) and radius from renderer dimensions. - Draws the main dial arc between minDeg and maxDeg. - Draws major tick marks and labels (Text) from \_min..\_max at 10-unit intervals. - Draws a center dot to cover the needle base.
Note: Static labels are created once; the stage is destroyed on disconnect, so no manual cleanup needed.
If the element can resize dynamically, consider re-drawing static parts on resize.
• #updateNeedle(angleRad): - Computes a triangular needle (tip + two base points) and fills it white. - Uses current renderer dimensions each frame to stay in sync with resizing.
• #updateProgressArc(currentAngleRad): - Draws a thick arc from the dial start to the current angle as a “progress” track. - Slightly inset relative to the main arc to avoid overlap.
• #setTargetFromSpeed(speed): - Clamps speed to [_min, _max], normalizes to t ∈ [0,1], lerps to degrees, converts to radians,
assigns targetAngle, and stores \_speed.

Ticking / easing:
• The Pixi ticker runs every frame; currentAngle += (targetAngle - currentAngle) \* 0.15
This exponential ease gives a smooth, natural motion without overshoot (tweak 0.1–0.25 to taste).

Utilities:
• #num(v, fallback): robust parse for attributes → returns fallback when not finite.

Usage examples:
HTML:
<engine-speed speed="50"></engine-speed>

    JS (property / ref):
      const el = document.querySelector('engine-speed')!;
      el.speed = 80;            // animate toward 80

    React + MobX (recommended):
      // give the whole store; component will subscribe with a coalesced reaction
      <engine-speed ref={speedRef} />
      useEffect(() => { speedRef.current!.store = store; }, [store]);

Performance & improvement notes:
• Attribute reflection is convenient but involves DOM attribute mutation; for 60fps updates,
the store reaction path already avoids attribute writes and updates the internal state directly.
• If the element can resize after mount, consider listening for Pixi’s resize or a ResizeObserver
and re-running #drawStatic() (or recalculating geometry) so ticks/labels realign precisely.
• For very large labels/ticks, cache text objects or use BitmapText if you need further gains.
• If you add more dynamic layers, prefer updating existing Graphics paths instead of recreating objects.

TL;DR:
This component is a Pixi-powered speedometer. It maps speed → angle, eases the needle toward the target,
and draws a progress arc. It accepts speed via attribute, property, or a MobX store (coalesced to rAF).
Cleanly initializes/destroys Pixi, and renders smoothly at the display’s frame rate.
