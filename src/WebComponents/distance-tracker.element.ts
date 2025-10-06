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
    const s = String(n);
    if (this.getAttribute("distance") !== s) this.setAttribute("distance", s);
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
