import { z } from "zod";
import { EMAIL_MAX_LENGTH, PASSWORD_LENGTH, TOTP_DIGITS, USERNAME_LENGTH, isAvatarKey } from "@novaspin/shared";

// Schemas for fields that appear in more than one route. Messages are error
// codes from @novaspin/shared (see lib/http.ts `parse`).

// Lower-cased so "Demo@x.test" and "demo@x.test" can't become two accounts.
export const email = z.string().trim().toLowerCase().max(EMAIL_MAX_LENGTH, "EMAIL_INVALID").email("EMAIL_INVALID");

// The most common 8+ character passwords from public breach lists. Anything
// here falls to the first guesses of a credential-stuffing script.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "password1234", "password!", "passw0rd", "p@ssw0rd",
  "p@ssword", "12345678", "123456789", "1234567890", "0123456789", "87654321", "11111111", "00000000",
  "12341234", "11223344", "123123123", "123321123", "qwertyui", "qwertyuiop", "qwerty123", "qwerty12",
  "1q2w3e4r", "1q2w3e4r5t", "q1w2e3r4", "zaq12wsx", "1qaz2wsx", "asdfghjk", "asdfghjkl", "zxcvbnm1",
  "iloveyou", "iloveyou1", "sunshine", "princess", "football", "baseball", "superman", "starwars",
  "whatever", "trustno1", "letmein1", "welcome1", "welcome123", "admin123", "administrator", "changeme",
  "computer", "internet", "michelle", "jennifer", "charlie1", "master12", "mustang1", "shadow12",
  "dragon12", "monkey12", "abcd1234", "abc12345", "aa123456", "a1b2c3d4", "passpass", "testtest",
  "test1234", "demo1234", "secret12", "hello123", "football1", "blink182", "pokemon1", "minecraft",
  "chocolate", "butterfly", "liverpool", "arsenal1", "chelsea1", "michael1", "jordan23", "summer12",
  "haslo123", "haslo1234", "zaq1@wsx", "polska12", "polska123", "kochanie", "kochamcie", "slonecznik",
  "novaspin", "novaspin1", "novaspin123", "casino123", "stake123", "bitcoin1",
]);

export const newPassword = z
  .string()
  .min(PASSWORD_LENGTH.min, "PASSWORD_TOO_SHORT")
  .max(PASSWORD_LENGTH.max, "PASSWORD_TOO_LONG")
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()) && !/^(.)\1+$/.test(p), "PASSWORD_TOO_COMMON");

/** A password being checked (sign-in, confirmations): only bounded, never judged. */
export const existingPassword = z.string().min(1, "PASSWORD_REQUIRED").max(PASSWORD_LENGTH.max, "INVALID_CREDENTIALS");

// Names show up in chat and on other players' referral lists, so they must
// not be able to pass for staff or someone else. NFKC folds look-alike forms
// ("ｓupport" → "support"); only Latin letters (Polish ones included),
// digits, spaces and . _ ' - are allowed, which rules out Cyrillic/Greek
// homoglyphs ("Аdmin"), invisible and direction-flipping characters, and
// stacked accents.
const ALLOWED_NAME = /^[\p{Script=Latin}\p{Nd}][\p{Script=Latin}\p{Nd} ._'-]*$/u;
const RESERVED_NAME = /\b(admin|administrator|moderator|mod|support|staff|official|system|novaspin)\b/i;
const LINK_LIKE = /(https?:\/\/|www\.|\.(com|net|org|io|gg|pl|ru|xyz|ly)\b)/i;

export const displayName = z
  .string()
  .max(USERNAME_LENGTH.max * 4, "USERNAME_LENGTH")
  .transform((n) => n.normalize("NFKC").replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(USERNAME_LENGTH.min, "USERNAME_LENGTH")
      .max(USERNAME_LENGTH.max, "USERNAME_LENGTH")
      .refine((n) => ALLOWED_NAME.test(n), "USERNAME_CHARACTERS")
      .refine((n) => !LINK_LIKE.test(n), "USERNAME_LINK")
      .refine((n) => !RESERVED_NAME.test(n), "USERNAME_RESERVED")
  );

/** Case, spacing and punctuation don't make a name different ("demo.player" = "Demo Player"). */
export const foldName = (name: string) => name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{Nd}]/gu, "");

export const avatar = z.string().refine(isAvatarKey, "AVATAR_INVALID");

export const totpCode = z.string().trim().regex(new RegExp(`^\\d{${TOTP_DIGITS}}$`), "TOTP_FORMAT");
