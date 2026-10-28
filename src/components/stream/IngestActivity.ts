/** Wall-clock freshness, independent of the frame's paused animation clock. */
export class IngestActivity {
  private last: number | null = null

  constructor(private readonly now: () => number) {}

  touch(): void {
    this.last = this.now()
  }
  clear(): void {
    this.last = null
  }
  elapsed(): number {
    return this.last == null ? 0 : Math.max(0, this.now() - this.last)
  }
}
