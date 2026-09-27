import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// RFC 6238 TOTP (SHA-1, 6 digits, 30s steps) — what Google Authenticator,
// 1Password, Authy etc. expect.

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    value = (value << 5) | ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export function hotp(secret: string, counter: number, digits = 6): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(message).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) | (hmac[offset + 1]! << 16) | (hmac[offset + 2]! << 8) | hmac[offset + 3]!;
  return String(binary % 10 ** digits).padStart(digits, "0");
}

export function totp(secret: string, timeMs = Date.now(), stepSeconds = 30, digits = 6): string {
  return hotp(secret, Math.floor(timeMs / 1000 / stepSeconds), digits);
}

/** Accepts the current code and one step either side, to absorb clock drift. */
/**
 * Returns the 30-second time step the code belongs to (allowing `window`
 * steps of clock drift), or null. Callers store the step to refuse replays.
 */
export function matchTotpStep(secret: string, code: string, timeMs = Date.now(), window = 1): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const given = Buffer.from(code);
  const now = Math.floor(timeMs / 30_000);
  for (let step = now - window; step <= now + window; step++) {
    if (timingSafeEqual(given, Buffer.from(totp(secret, step * 30_000)))) return step;
  }
  return null;
}

export function verifyTotp(secret: string, code: string, timeMs = Date.now(), window = 1): boolean {
  return matchTotpStep(secret, code, timeMs, window) !== null;
}

export function otpauthUrl(secret: string, account: string, issuer = "NovaSpin Demo"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${label}?${params}`;
}
