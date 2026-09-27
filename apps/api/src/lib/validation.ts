import { z } from "zod";

// Lower-cased so "Demo@x.test" and "demo@x.test" can't become two accounts.
export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254, "Enter a valid email address");

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

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), "That password is too common — pick something less guessable")
  .refine((p) => !/^(.)\1+$/.test(p), "That password is too common — pick something less guessable");

// Names show up in chat and on other players' referral lists, so no links,
// invisible characters, or pretending to be staff.
const RESERVED_NAME = /\b(admin|administrator|moderator|mod|support|staff|official|system|novaspin)\b/i;
const LINK_LIKE = /(https?:\/\/|www\.|\.(com|net|org|io|gg|pl|ru|xyz|ly)\b)/i;
// Control, zero-width, bidi-override and other format characters.
const INVISIBLE = /[\p{Cc}\p{Cf}]/u;

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Username must be 2–40 characters")
  .max(40, "Username must be 2–40 characters")
  .refine((n) => !INVISIBLE.test(n), "Username contains characters that aren't allowed")
  .refine((n) => !LINK_LIKE.test(n), "Usernames can't contain links")
  .refine((n) => !RESERVED_NAME.test(n), "That username is reserved");
