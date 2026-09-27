import { buildApp } from "./app.js";
import { DEFAULT_JWT_SECRET, JWT_SECRET } from "./config.js";

// Tokens signed with the public default secret can be forged by anyone.
if (process.env.NODE_ENV === "production" && JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.error("Refusing to start: set JWT_SECRET to a long random value when NODE_ENV=production.");
  process.exit(1);
}

const app = await buildApp();

const port = Number(process.env.PORT ?? 8787);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
