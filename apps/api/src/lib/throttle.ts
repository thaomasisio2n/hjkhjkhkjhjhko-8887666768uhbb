/**
 * Counts failures per key (e.g. an email address) in a fixed window. Unlike
 * the per-IP rate limit, this stops one account being guessed at from many
 * IPs. In memory on purpose: the demo runs as a single process, and a
 * restart simply forgets old failures.
 */
export class FailureThrottle {
  private entries = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly maxKeys = 50_000
  ) {}

  /** Milliseconds until the key may try again, or 0 if it isn't blocked. */
  blockedFor(key: string, now = Date.now()) {
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) return 0;
    return entry.count >= this.max ? entry.resetAt - now : 0;
  }

  fail(key: string, now = Date.now()) {
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.entries.size >= this.maxKeys) this.prune(now);
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
  }

  clear(key: string) {
    this.entries.delete(key);
  }

  private prune(now: number) {
    for (const [key, entry] of this.entries) if (entry.resetAt <= now) this.entries.delete(key);
    // Still full (a flood of distinct keys)? Drop the oldest half rather than grow without bound.
    if (this.entries.size >= this.maxKeys) {
      let drop = Math.floor(this.entries.size / 2);
      for (const key of this.entries.keys()) {
        if (drop-- <= 0) break;
        this.entries.delete(key);
      }
    }
  }
}
