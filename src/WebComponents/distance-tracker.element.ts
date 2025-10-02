/*
  DistanceTrackerElement (custom element: <distance-tracker>)
  -----------------------------------------------------------
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

  1) observedAttributes():
     - Returns ["distance", "speed"], telling the platform to notify when these attributes change.
     - When they do, attributeChangedCallback(...) is invoked.

  2) Shadow DOM:
     - `this.attachShadow({ mode: "open" })` creates an OPEN shadow root at construction.
       All markup/styles are scoped to `this.shadowRoot`, isolating the component’s UI
       from page CSS and making styling predictable.

  3) Internal state:
     - `_distance` and `_speed` hold numeric state used by render().
     - `_reflecting` is a reentrancy guard used to avoid loops when reflecting properties back to attributes.

  4) connectedCallback():
     - Lifecycle hook that runs when the element is inserted into the DOM.
     - Reads initial `distance` and `speed` from attributes (if present), coerces them to numbers,
       initializes internal state, and calls render() once for the initial paint.

  5) attributeChangedCallback(name, _oldV, newV):
     - Runs whenever an observed attribute changes (either user edits in HTML or programmatic setAttribute).
     - Coerces `newV` to a number (defaults to 0 if falsy), and if it differs from current internal state,
       updates the corresponding field and re-renders.
     - This is the central path for attribute-driven synchronization.

  6) Public API (properties): get/set distance, get/set speed
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

  7) render():
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
*/
class DistanceTrackerElement extends HTMLElement {
  static get observedAttributes() {
    return ["distance", "speed"];
  }

  private root = this.attachShadow({ mode: "open" });
  private _distance = 0;
  private _speed = 0;
  private _reflecting = false; // reentrancy guard

  connectedCallback() {
    this._distance = Number(this.getAttribute("distance") ?? 0) || 0;
    this._speed = Number(this.getAttribute("speed") ?? 0) || 0;
    this.render();
  }

  attributeChangedCallback(name: string, _oldV: string | null, newV: string | null) {
    const n = Number(newV ?? 0) || 0;
    if (name === "distance" && n !== this._distance) {
      this._distance = n;
      this.render();
    }
    if (name === "speed" && n !== this._speed) {
      this._speed = n;
      this.render();
    }
  }

  get distance(): number {
    return this._distance;
  }

  get speed(): number {
    return this._speed;
  }

  set distance(v: number) {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    if (this._distance === n) return;
    this._distance = n;
    // reflect (helps with devtools and attribute-driven flows)
    if (this.getAttribute("distance") !== String(n)) {
      this.setAttribute("distance", String(n));
    }
    this.render();
  }
  set speed(v: number) {
    const n = Number(v);
    if (!Number.isFinite(n) || n === this._speed) return;
    this._speed = n;
    // reflect to attribute without re-entry
    if (!this._reflecting) {
      this._reflecting = true;
      const str = String(n);
      if (this.getAttribute("speed") !== str) this.setAttribute("speed", str);
      this._reflecting = false;
    }
    this.render();
  }

  private render() {
    console.log("[distance-tracker] render", { distance: this._distance });
    this.root.innerHTML = /*html*/ `
      <style>
        @font-face {
          font-family: "Inter";
          src: url("../assets/fonts/Inter-Regular.woff2") format("woff2");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        :host {
          box-sizing: border-box;
          height: 100px;
          width: 197px;
          padding: 20px;
          border: 1px solid #ffffff;
          background: #1a1823;
          font: 14px/1.2 Inter;
          display: flex;
          gap: 24px;
          align-items: center;
          flex-direction: row;
          justify-content: space-between;
        }
        .value {
          font: 32px/1.2 Inter;
          font-weight: 600;
        }
      </style>
      <div><span class="value">${this._speed.toFixed(0)}</span><br />km/h</div>
      <div>
        <span class="value">${this._distance.toFixed(0)}</span><br />
        km
      </div>
    `;
  }
}

if (!customElements.get("distance-tracker")) {
  customElements.define("distance-tracker", DistanceTrackerElement);
}

export {};
