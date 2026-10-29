import argon2 from "argon2";
import { ApiError } from "./http.js";

// argon2id with OWASP's recommended minimum (19 MiB, 2 passes). Every hash
// costs real memory and CPU, so a flood of sign-ins could exhaust the box:
// at most MAX_CONCURRENT run at once, a bounded queue waits, and anything
// beyond that gets "server busy" instead of taking the process down.
const OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 };
const MAX_CONCURRENT = 4;
const MAX_QUEUED = 64;

let running = 0;
const queue: (() => void)[] = [];

async function withSlot<T>(work: () => Promise<T>): Promise<T> {
  if (running < MAX_CONCURRENT) {
    running++;
  } else {
    if (queue.length >= MAX_QUEUED) throw new ApiError("SERVER_BUSY");
    // Woken with a slot handed over directly, so nobody can slip in between.
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  try {
    return await work();
  } finally {
    const next = queue.shift();
    if (next) next();
    else running--;
  }
}

export function hashPassword(password: string) {
  return withSlot(() => argon2.hash(password, OPTIONS));
}

// Checked against when there's no account, so a miss costs as much as a
// wrong password and timing doesn't reveal who has signed up.
let dummyHash: Promise<string> | undefined;

/** Constant-effort check; `hash` is null when the account doesn't exist. */
export async function verifyPassword(hash: string | null, password: string) {
  dummyHash ??= hashPassword("timing-equaliser-not-a-real-password");
  const target = hash ?? (await dummyHash);
  const ok = await withSlot(() => argon2.verify(target, password));
  return ok && hash !== null;
}
