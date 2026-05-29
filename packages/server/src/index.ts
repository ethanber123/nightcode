import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sessions from "./routes/sessions";
import { sentry } from "@sentry/hono/bun";
import * as Sentry from "@sentry/hono/bun";

const app = new Hono();

// Bun is provided at runtime; declare for TypeScript to avoid "Cannot find name 'Bun'".
declare const Bun: { serve: (opts: any) => void };

app.use(
  sentry(app, {
    dsn: "https://4c8771190b39e082aecff3752d1736ea@o4511190065348608.ingest.us.sentry.io/4511473929682944",
    tracesSampleRate: 1.0,
    enableLogs: true,
    sendDefaultPii: true,
  }),
);

app.get("/debug-sentry", () => {
  // Send a log before throwing the error
  Sentry.logger.info("User triggered test error", {
    action: "test_error_endpoint",
  });
  // Send a test metric before throwing the error
  Sentry.metrics.count("test_counter", 1);
  throw new Error("My first Sentry error!");
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    if (error instanceof HTTPException) {
      Sentry.logger.warn("Handled HTTP error", {
        status: error.status,
        message: error.message || "Request failed",
        path: c.req.path,
        method: c.req.method,
      });
    }
    return c.json(
      {
        error: error.message || "Request failed",
      },
      error.status,
    );
  }

  Sentry.logger.error("Unhandled server error", {
    path: c.req.path,
    method: c.req.method,
    message: error instanceof Error ? error.message : "Unknown error",
  });
  return c.json({ error: "Internal server error" }, 500);
});

app.get("/", (c) => c.text("SERVER WORKING"));
app.route("/sessions", sessions);

Bun.serve({
  port: 3000,
  fetch: app.fetch,
});

console.log("Server running on http://localhost:3000");
