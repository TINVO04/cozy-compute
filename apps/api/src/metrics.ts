type Labels = Record<string, string>;

class Metrics {
  private counters = new Map<string, Map<string, number>>();
  private gauges = new Map<string, () => Promise<number> | number>();

  inc(name: string, labels: Labels = {}, by = 1): void {
    const key = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v.replace(/"/g, '')}"`)
      .join(',');
    const series = this.counters.get(name) ?? new Map<string, number>();
    series.set(key, (series.get(key) ?? 0) + by);
    this.counters.set(name, series);
  }

  gauge(name: string, read: () => Promise<number> | number): void {
    this.gauges.set(name, read);
  }

  async render(): Promise<string> {
    const lines: string[] = [];
    for (const [name, series] of this.counters) {
      lines.push(`# TYPE cozy_${name} counter`);
      for (const [labels, value] of series) lines.push(`cozy_${name}${labels ? `{${labels}}` : ''} ${value}`);
    }
    for (const [name, read] of this.gauges) {
      lines.push(`# TYPE cozy_${name} gauge`);
      lines.push(`cozy_${name} ${await read()}`);
    }
    return lines.join('\n') + '\n';
  }
}

export const metrics = new Metrics();
