import { buildApp } from "./app.js";
import { DEFAULT_JWT_SECRET, JWT_SECRET_IS_RANDOM, WEB_ORIGIN } from "./config.js";

const configuredSecret = process.env.JWT_SECRET ?? "";

if (process.env.NODE_ENV === "production") {
  // Production needs an explicit, long secret: tokens signed with a public or
  // short one can be forged, which means signing in as anyone.
  if (!configuredSecret || configuredSecret === DEFAULT_JWT_SECRET || configuredSecret.length < 32) {
    console.error("Refusing to start: set JWT_SECRET to a random value of at least 32 characters when NODE_ENV=production.");
    console.error(`  e.g. node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`);
    process.exit(1);
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(WEB_ORIGIN)) {
    console.warn(`WEB_ORIGIN is ${WEB_ORIGIN}: fine for local Docker, but set it to the public web address when hosting.`);
  }
} else if (JWT_SECRET_IS_RANDOM) {
  console.warn("JWT_SECRET isn't set (or is the old public default): using a random one, so sessions end when the API restarts.");
}

const app = await buildApp();

const port = Number(process.env.PORT ?? 8787);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
