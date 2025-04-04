import { Hono } from "hono";
import { cors } from "hono/cors"; // Use Hono's built-in CORS middleware
import type { PagesFunction, Fetcher } from "@cloudflare/workers-types";
import { Bindings } from "hono/types";

interface Env {
      // Service binding to the backend API worker
      API_WORKER: Fetcher;
      // Optional: Environment variable for allowed origins
      CORS_ALLOW_ORIGIN?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", async (c, next) => {
      const handler = cors({
            // Use environment variable or fallback to '*' (Restrict in production!)
            origin: c.env.CORS_ALLOW_ORIGIN || "*",
            allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
            allowHeaders: ["Content-Type", "Authorization"], // Add others if needed by frontend
            credentials: true,
            maxAge: 86400, // 1 day cache for preflight
      });
      // Apply CORS handling
      return handler(c, next);
});

/**
 * Catch-all Proxy Handler for /api/* routes
 */
app.all("/api/*", async (c) => {
      const userEmail = c.req.header("cf-access-authenticated-user-email");
      // const userEmail = "nagee";

      // Optional: Early exit if auth fails (though API worker should also check)
      if (!userEmail) {
            return c.json({ error: "Authentication required" }, 401);
      }

      // 1. Construct target URL for the API worker
      const url = new URL(c.req.url);
      // Path will be like '/api/memories', '/api/assets/key', etc.
      const workerPath = url.pathname;
      const workerUrl = `https://image-processor-worker.archie9211.workers.dev${workerPath}${url.search}`; // Dummy base

      // 2. Prepare Headers for the backend worker request
      const workerHeaders = new Headers(c.req.raw.headers); // Start with original headers
      // Clean sensitive/unnecessary headers
      workerHeaders.delete("cookie");
      workerHeaders.delete("cf-connecting-ip");
      workerHeaders.delete("cf-ipcountry");
      workerHeaders.delete("cf-visitor");
      workerHeaders.delete("x-forwarded-for");
      workerHeaders.delete("x-real-ip");
      workerHeaders.delete("cf-access-authenticated-user-email");
      workerHeaders.delete("cf-access-jwt-assertion");
      // Add the custom auth header
      if (userEmail) {
            workerHeaders.set("X-Authenticated-User-Email", userEmail);
      }

      console.log(
            `Pages Proxy (Hono): Forwarding ${c.req.method} ${workerPath} for ${
                  userEmail || "anonymous?"
            }`
      );

      // 3. Forward the request to the API worker via Service Binding
      try {
            const workerResponse = await c.env.API_WORKER.fetch(workerUrl, {
                  method: c.req.method,
                  headers: workerHeaders,
                  body: c.req.raw.body ? await c.req.raw.arrayBuffer() : null, // Convert body to ArrayBuffer if present
                  redirect: "manual",
            });

            console.log(
                  `Pages Proxy (Hono): Received status ${workerResponse.status} from API Worker.`
            );

            // 4. Return the response from the worker
            // Hono automatically handles setting the body and status.
            // CORS headers are added by the middleware applied earlier.
            return workerResponse as unknown as Response; // Cast to standard Response type
      } catch (error: any) {
            console.error(
                  "Pages Proxy (Hono): Error fetching API worker:",
                  error
            );
            return c.text("Error proxying request to backend API.", 502); // 502 Bad Gateway
      }
});

// --- Export the Pages Function Handler ---
// This connects Hono to the Cloudflare Pages Function runtime
export const onRequest: PagesFunction<Bindings> = async (context) => {
      return app.fetch(
            context.request as unknown as Request,
            context.env,
            context
      ) as unknown as import("@cloudflare/workers-types").Response;
};
