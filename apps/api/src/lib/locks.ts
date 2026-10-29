// Runs async work one at a time per key (e.g. per user) inside this process,
// for read-check-write sequences a single UPDATE can't express. The demo
// runs as one process, so this is enough to close those races.
const tails = new Map<string, Promise<unknown>>();

export function serialized<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();
  const run = previous.then(work, work);
  const tail = run.catch(() => undefined);
  tails.set(key, tail);
  // Forget the key once nothing else is queued behind this run.
  void tail.then(() => {
    if (tails.get(key) === tail) tails.delete(key);
  });
  return run;
}
