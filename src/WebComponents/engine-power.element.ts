/*
  EngingePowerElement (custom element: <engine-power>)
  ---------------------------------------------------
  What it is:
    A simple Web Component that displays a numeric "power" value and re-renders whenever
    that value changes. It supports BOTH:
      • Attribute-based updates:   <engine-power power="42"></engine-power>
      • Property-based updates:    const el = document.querySelector('engine-power')!; el.power = 42; 
      1) Property (ref) driven:  ref.current.power = 42
        - How: In JS/TS, set the class property via a ref (or direct element var).
        - Pros:
          • Type-safe (v: number), no string→number conversions
          • Fast: skips attribute mutation & attributeChangedCallback
          • Great for app-internal/stateful updates (MobX/React).
        - Cons:
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
  1) observedAttributes():
     - Declares which attributes should be watched for changes by the platform.
     - Here it returns ["power"], meaning when the 'power' attribute changes,
       attributeChangedCallback(...) will run.

  2) Shadow DOM setup:
     - The field `private root = this.attachShadow({ mode: "open" });` creates an OPEN shadow root
       as soon as the instance is constructed. All rendering (markup + styles) is scoped inside
       this.shadowRoot so page-wide CSS doesn't accidentally affect it (and vice versa).
     - "open" means external code can access el.shadowRoot for debugging/testing.

  3) Internal state:
     - `_power` holds the current numeric value. This is the single source of truth used by render().
     - The public getter/setter `power` exposes a typed property API on the element.

  4) Lifecycle: connectedCallback():
     - Runs when the element is inserted into the DOM.
     - Reads the initial "power" attribute (if present), converts it to a number, stores it in _power,
       and calls render() to paint the UI for the first time.
     - Note: If the attribute wasn’t present, it defaults to 0.

  5) attributeChangedCallback(name, oldV, newV):
     - Runs whenever an observed attribute changes (including programmatic changes via setAttribute()).
     - Filters for 'power' and ignores no-op changes (oldV === newV).
     - Converts the new value to a number (Number(newV) || 0), updates _power, and re-renders.
     - This is the main path for attribute-driven updates.

  6) Public API (property): get/set power
     - Getter returns the current numeric _power.
     - Setter accepts any value, coerces to Number, validates it, and—IMPORTANTLY—calls
       setAttribute('power', String(n)) instead of directly mutating _power.
       Why? This design "reflects" property changes back to the attribute so both stay in sync,
       and it centralizes the actual state update in attributeChangedCallback().
       That means the flow is: property set -> attribute change -> attributeChangedCallback -> _power + render().
     - This reflection pattern is handy for tooling/devtools (you can see current value in HTML),
       but it does involve an attribute write per update.

  7) render():
     - Replaces the entire shadow DOM content with a small template that includes:
       • Scoped styles for the host element
       • A display of the current _power value
     - Called after initial connect and after every accepted change to _power.

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
      you can change the setter to assign _power and call render() directly, skipping setAttribute().
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
*/

import { Application, Graphics } from "pixi.js";

class EngingePowerElement extends HTMLElement {
  static get observedAttributes() {
    return ["power"];
  }

  private root = this.attachShadow({ mode: "open" });
  private _power = 0;

  private wrapper!: HTMLDivElement;
  private app!: Application;
  private graphics!: Graphics;

  connectedCallback() {
    console.log("[engine-power] connected");
    this._power = Number(this.getAttribute("power") ?? 0);

    this.wrapper = document.createElement("div");
    this.wrapper.style.width = "55px";
    this.wrapper.style.height = "219px";
    this.root.appendChild(this.wrapper);

    const style = document.createElement("style");
    style.textContent = `
        canvas { outline: none; }
        :host { outline: none; }
      `;
    this.root.appendChild(style);

    this.initPixi();
    // this.render();
  }
  attributeChangedCallback(name: string, oldV: string | null, newV: string | null) {
    console.log("attr change:", { oldV, newV });
    if (name !== "power" || oldV === newV) return;
    this._power = Number(newV ?? 0) || 0;
    this.render();
  }

  get power() {
    return this._power;
  }

  set power(v: number) {
    const n = Number(v);
    if (!Number.isFinite(n) || n === this._power) return;
    this.setAttribute("power", String(n));
  }

  private async initPixi() {
    this.app = new Application();
    await this.app.init({ resizeTo: this.wrapper, backgroundAlpha: 0 });
    this.wrapper.appendChild(this.app.canvas);

    this.graphics = new Graphics();
    this.app.stage.addChild(this.graphics);

    this.render();
  }

  private render() {
    if (!this.graphics) return;
    this.graphics.clear();

    const w = 55;
    const h = 219;

    const fillH = Math.max(0, Math.min(h - 2, (this._power / 6) * (h - 2)));

    const innerYBottom = h - 1;
    const innerW = w - 2;

    this.graphics.rect(1, innerYBottom - fillH, innerW, fillH).fill({ color: 0x3b82f6 });
    this.graphics.rect(0.5, 0.5, w - 1, h - 1).stroke({
      width: 1,
      color: 0xffffff,
      alignment: 0.5,
    });
  }
}

if (!customElements.get("engine-power")) customElements.define("engine-power", EngingePowerElement);

export {};
