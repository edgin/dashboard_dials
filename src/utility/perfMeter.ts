// perfMeter.ts
export type Phase = "frame" | "staticRedraw" | "dynamicRedraw";

export class PerfMeter {
  private rafDeltas: number[] = [];
  private phases: Record<Phase, number[]> = {
    frame: [],
    staticRedraw: [],
    dynamicRedraw: [],
  };
  private lastRaf = 0;
  private budget = 16.67; // 60Hz default
  private longTasks = 0;
  private obs?: PerformanceObserver;

  constructor(hz: 60 | 120 = 60) {
    this.budget = hz === 60 ? 16.67 : 8.33;
    if ("PerformanceObserver" in window) {
      try {
        this.obs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            // @ts-ignore
            if (e.entryType === "longtask") this.longTasks++;
          }
        });
        // @ts-ignore
        this.obs.observe({ entryTypes: ["longtask"] });
      } catch {}
    }
  }

  onRafStart = (t: number) => {
    if (this.lastRaf) this.rafDeltas.push(t - this.lastRaf);
    this.lastRaf = t;
  };

  time<T>(phase: Phase, fn: () => T): T {
    const t0 = performance.now();
    const out = fn();
    this.phases[phase].push(performance.now() - t0);
    return out;
  }

  private pct(n: number) {
    return (n * 100).toFixed(1) + "%";
  }
  private p(arr: number[], q: number) {
    if (!arr.length) return 0;
    const a = [...arr].sort((a, b) => a - b);
    const i = Math.floor(q * (a.length - 1));
    return a[i];
  }

  report() {
    const ft = this.rafDeltas;
    const over = ft.filter((v) => v >= this.budget).length;
    const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const block = (arr: number[]) => ({
      count: arr.length,
      mean: +mean(arr).toFixed(3),
      p50: +this.p(arr, 0.5).toFixed(3),
      p95: +this.p(arr, 0.95).toFixed(3),
      p99: +this.p(arr, 0.99).toFixed(3),
    });
    return {
      frames: ft.length,
      frameTime: {
        ...block(ft),
        droppedPct: ft.length ? this.pct(over / ft.length) : "0.0%",
        budgetMs: this.budget,
      },
      phases: {
        frame: block(this.phases.frame),
        staticRedraw: block(this.phases.staticRedraw),
        dynamicRedraw: block(this.phases.dynamicRedraw),
      },
      longTasks: this.longTasks,
      at: new Date().toISOString(),
    };
  }

  reset() {
    this.rafDeltas.length = 0;
    this.phases.frame.length = 0;
    this.phases.staticRedraw.length = 0;
    this.phases.dynamicRedraw.length = 0;
    this.longTasks = 0;
    this.lastRaf = 0;
  }
}
