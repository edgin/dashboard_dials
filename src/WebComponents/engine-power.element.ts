class EngingePowerElement extends HTMLElement {
  static get observedAttributes() {
    return ["power"];
  }

  private root = this.attachShadow({ mode: "open" });
  private _power = 0;

  connectedCallback() {
    console.log("[engine-power] connected");
    this._power = Number(this.getAttribute("power") ?? 0);
    this.render();
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

  private render() {
    console.log("[engine-power] render", { power: this._power });
    this.root.innerHTML = /*html*/ `
      <style>
        :host {
          display: block;
          height: 40px;
          font: 14px/1.2 system-ui;
        }
      </style>
      <div>Engine Power: <br />${this._power}</div>
    `;
  }
}

if (!customElements.get("engine-power")) customElements.define("engine-power", EngingePowerElement);

export {};
