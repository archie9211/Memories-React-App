import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
      R2Bucket,
      D1Database,
      D1Result,
      R2ObjectBody,
      PagesFunction,
} from "@cloudflare/workers-types";

// Types (Bindings, AccessJwtPayload - remain the same)
type Bindings = {
      FOOTER_TEXT: string;
      APP_TITLE: string;
      DB: D1Database;
      ASSETS_BUCKET: R2Bucket;
};
interface AccessJwtPayload {
      email: string;
}

interface GetSignedUrlParams {
      Bucket: string;
      Key: string;
      Expires: number;
}

interface AccessJwtPayload {
      email: string;
}

interface R2PutSignedUrlOptions {
      method: string;
      key: string;
      expiresIn?: number;
}

interface TempCredentialsResponse {
      result: {
            accessKeyId: string;
            secretAccessKey: string;
            sessionToken: string;
      };
      success: boolean;
}

const getUser = (c: any): string | null => {
      return "nageen523@gmail.com";
      const email = c.req.header("cf-access-authenticated-user-email");
      return email || null;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", cors()); // Keep CORS for local devc

// --- Helper for building dynamic WHERE clauses ---
function buildWhereClause(params: Record<string, string | undefined>): {
      clause: string;
      bindings: any[];
} {
      let conditions: string[] = [];
      let bindings: any[] = [];

      if (params.q) {
            // Basic text search (adjust fields as needed)
            conditions.push(
                  "(content LIKE ? OR caption LIKE ? OR location LIKE ? OR tags LIKE ?)"
            );
            const searchTerm = `%${params.q}%`;
            bindings.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      if (params.location) {
            conditions.push("location LIKE ?");
            bindings.push(`%${params.location}%`);
      }
      if (params.startDate) {
            conditions.push("memory_date >= ?");
            bindings.push(params.startDate); // Expect ISO 8601 format 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ssZ'
      }
      if (params.endDate) {
            // Add 1 day to endDate if only date is provided, to include the whole day
            let endDateVal = params.endDate;
            if (endDateVal && endDateVal.length === 10) {
                  // YYYY-MM-DD format
                  endDateVal = `${endDateVal}T23:59:59.999Z`;
            }
            conditions.push("memory_date <= ?");
            bindings.push(endDateVal);
      }
      if (params.tags) {
            // Assumes tags is a comma-separated string in query params and DB
            const tagsToSearch = params.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean);
            if (tagsToSearch.length > 0) {
                  const tagConditions = tagsToSearch.map(() => "tags LIKE ?");
                  conditions.push(`(${tagConditions.join(" AND ")})`); // All tags must be present
                  bindings.push(...tagsToSearch.map((tag) => `%${tag}%`)); // Simple LIKE matching
            }
      }

      // --- Cursor Pagination ---
      if (params.cursorDate && params.cursorId) {
            // Fetch items strictly older than the cursor
            // Need to compare date first, then ID for tie-breaking
            conditions.push(
                  "(memory_date < ? OR (memory_date = ? AND id < ?))"
            );
            bindings.push(
                  params.cursorDate,
                  params.cursorDate,
                  params.cursorId
            );
      }

      return {
            clause:
                  conditions.length > 1
                        ? `WHERE ${conditions.join(" AND ")}`
                        : conditions.length === 1
                        ? `WHERE ${conditions[0]}`
                        : "",
            bindings: bindings,
      };
}

app.get("/api/config", (c) => {
      // Read variables from the environment binding
      const title = c.env.APP_TITLE || "Memory Timeline"; // Fallback
      const footer = c.env.FOOTER_TEXT || `© ${new Date().getFullYear()}`; // Fallback

      return c.json({
            appTitle: title,
            footerText: footer,
      });
});

// GET /api/memories - Fetch memories with filtering and pagination
app.get("/api/memories", async (c) => {
      const userEmail = getUser(c);
      if (!userEmail) {
            return c.json({ error: "Unauthorized" }, 401);
      }

      const limit = parseInt(c.req.query("limit") || "10", 10);
      const queryParams = {
            q: c.req.query("q"),
            location: c.req.query("location"),
            startDate: c.req.query("startDate"),
            endDate: c.req.query("endDate"),
            tags: c.req.query("tags"),
            cursorDate: c.req.query("cursorDate"), // Expect ISO date string
            cursorId: c.req.query("cursorId"), // Expect memory ID
      };

      const { clause, bindings } = buildWhereClause(queryParams);

      // Fetch one extra item to determine if there are more pages
      const sql = `
        SELECT *
        FROM memories
        ${clause}
        ORDER BY memory_date DESC, id DESC
        LIMIT ?`;

      try {
            // console.log("SQL:", sql); // Debugging
            // console.log("Bindings:", [...bindings, limit + 1]); // Debugging
            const { results }: D1Result<any> = await c.env.DB.prepare(sql)
                  .bind(...bindings, limit + 1) // Bind limit + 1
                  .all();

            let memories = results || [];
            let nextCursor: { date: string; id: string } | null = null;

            if (memories.length > limit) {
                  // There are more items, remove the extra one and set the cursor
                  const cursorMemory = memories[limit]; // The extra item used for cursor check
                  nextCursor = {
                        date: cursorMemory.memory_date,
                        id: cursorMemory.id,
                  };
                  memories = memories.slice(0, limit); // Return only the requested number of items
            }
            // console.log("Memories", memories);

            return c.json({
                  memories: memories,
                  nextCursor: nextCursor, // Send null if no more items
            });
      } catch (e: any) {
            console.error("Error fetching memories:", e);
            return c.json(
                  { error: "Failed to fetch memories", details: e.message },
                  500
            );
      }
});
app.post("/api/assets", async (c) => {
      const userEmail = getUser(c);
      if (!userEmail) {
            return c.json(
                  { error: "Unauthorized: User required for upload." },
                  401
            );
      }

      try {
            const formData = await c.req.formData();
            const file = formData.get("file") as File | null; // 'file' is the field name expected from frontend

            if (!file || !(file instanceof File)) {
                  return c.json(
                        { error: "File data not provided or invalid." },
                        400
                  );
            }

            // Optional: Add size validation
            const maxSize = 100 * 1024 * 1024; // 100 MB limit (adjust as needed)
            if (file.size > maxSize) {
                  return c.json(
                        {
                              error: `File size exceeds the limit of ${
                                    maxSize / 1024 / 1024
                              } MB.`,
                        },
                        413
                  );
            }

            // Generate a unique key for the asset in R2
            const sanitizedFileName = file.name.replace(/\s+/g, "-");
            const uniqueKey = `${crypto.randomUUID()}-${sanitizedFileName}`;

            // Upload the file directly to R2
            const fileBlob = new Blob([await file.arrayBuffer()], {
                  type: file.type,
            });
            await c.env.ASSETS_BUCKET.put(uniqueKey, await file.arrayBuffer(), {
                  httpMetadata: {
                        contentType: file.type || "application/octet-stream", // Store content type
                        // Add other metadata if needed, e.g., cacheControl
                        cacheControl: "public, max-age=31536000, immutable", // Long cache for immutable assets
                  },
                  // customMetadata: { userId: userEmail }, // Optional: Store custom metadata if useful
            });

            // Return the generated key to the client
            return c.json({ key: uniqueKey });
      } catch (e: any) {
            console.error("Error uploading asset:", e);
            // Check for specific errors, e.g., R2 errors
            if (
                  e instanceof Error &&
                  e.message.includes("Request body size exceeds")
            ) {
                  return c.json(
                        {
                              error: "File too large for direct upload via Worker.",
                              details: e.message,
                        },
                        413
                  );
            }
            return c.json(
                  { error: "Failed to upload asset", details: e.message },
                  500
            );
      }
});
app.get("/api/assets/:key{.+}", async (c) => {
      const userEmail = getUser(c);
      if (!userEmail) {
            // Return 401 or potentially redirect to login depending on desired behavior for direct access attempts
            return new Response("Unauthorized: Access requires login.", {
                  status: 401,
            });
      }

      const key = c.req.param("key");

      // --- CRITICAL SECURITY CHECK ---
      // Ensure the requested key belongs to the logged-in user.
      // Adjust this logic if assets can be shared in the future.
      // if (!key.startsWith(`${userEmail}/`)) {
      //       console.warn(
      //             `Forbidden access attempt: User ${userEmail} tried to access key ${key}`
      //       );
      //       return new Response(
      //             "Forbidden: You do not have permission to access this asset.",
      //             { status: 403 }
      //       );
      // }

      try {
            // Fetch the object from R2
            const object: R2ObjectBody | null = await c.env.ASSETS_BUCKET.get(
                  key
            );

            if (object === null) {
                  return new Response("Object Not Found", { status: 404 });
            }

            // Prepare headers for the response
            const headers = new Headers();
            object.writeHttpMetadata(
                  headers as unknown as import("@cloudflare/workers-types").Headers
            ); // Cast to Cloudflare Headers type
            headers.set("etag", object.httpEtag); // Set ETag for browser caching
            // Optional: Add Content-Disposition if you want to force download sometimes
            // headers.set('Content-Disposition', `inline; filename="${object.key.split('/').pop()}"`);

            // Stream the object body directly in the response
            return new Response(
                  object.body
                        ? (object.body as unknown as ReadableStream)
                        : null,
                  {
                        headers: headers,
                  }
            );
      } catch (e: any) {
            console.error(`Error fetching asset ${key}:`, e);
            return new Response("Internal Server Error retrieving asset", {
                  status: 500,
            });
      }
});
// POST /api/memories - Add a new memory (Add tags handling)
const addMemorySchema = z.object({
      type: z.enum(["quote", "image", "video", "hybrid"]),
      content: z.string().optional(),
      asset_key: z.string().optional(),
      caption: z.string().optional(),
      location: z.string().optional(),
      memory_date: z.string().datetime(),
      tags: z.string().optional(), // Comma-separated string of tags
});

app.post("/api/memories", zValidator("json", addMemorySchema), async (c) => {
      const userEmail = getUser(c);
      if (!userEmail) return c.json({ error: "Unauthorized" }, 401);

      const body = c.req.valid("json");
      const id = crypto.randomUUID();

      // Validation (remains similar)
      if ((body.type === "image" || body.type === "video") && !body.asset_key)
            return c.json({ error: "asset_key required" }, 400);
      if ((body.type === "quote" || body.type === "hybrid") && !body.content)
            return c.json({ error: "content required" }, 400);

      // Process tags: clean up, remove duplicates, join back
      const tagsString = body.tags
            ? body.tags
                    .split(",")
                    .map((t) => t.trim().toLowerCase())
                    .filter((t) => t.length > 0)
                    .filter(
                          (value, index, self) => self.indexOf(value) === index
                    ) // Unique
                    .join(",")
            : null;

      try {
            const stmt = c.env.DB.prepare(
                  `INSERT INTO memories (id, user_id, type, content, asset_key, caption, location, memory_date, tags, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)` // Add tags, set created/updated
            );
            const info = await stmt
                  .bind(
                        id,
                        userEmail,
                        body.type,
                        body.content ?? null,
                        body.asset_key ?? null,
                        body.caption ?? null,
                        body.location ?? null,
                        body.memory_date,
                        tagsString
                  )
                  .run();

            if (info.success) {
                  // Fetch the newly created memory to return it (including generated timestamps)
                  const { results } = await c.env.DB.prepare(
                        "SELECT * FROM memories WHERE id = ?"
                  )
                        .bind(id)
                        .all();
                  if (results && results.length > 0) {
                        // Format tags back to array for frontend consistency if needed, or keep as string
                        // results[0].tags = results[0].tags ? results[0].tags.split(',') : [];
                        return c.json({ memory: results[0] }, 201);
                  } else {
                        return c.json(
                              {
                                    error: "Memory created but could not retrieve.",
                              },
                              500
                        );
                  }
            } else {
                  return c.json(
                        { error: "Failed to add memory", details: info.error },
                        500
                  );
            }
      } catch (e: any) {
            console.error("Error adding memory:", e);
            return c.json(
                  { error: "Failed to add memory", details: e.message },
                  500
            );
      }
});

// PATCH /api/memories/:id - Update an existing memory
const updateMemorySchema = addMemorySchema.partial().extend({
      // Allow partial updates
      // Ensure type and memory_date are still required if sent, but optional overall for PATCH
      type: z.enum(["quote", "image", "video", "hybrid"]).optional(),
      memory_date: z.string().datetime().optional(),
});

app.patch(
      "/api/memories/:id",
      zValidator("json", updateMemorySchema),
      async (c) => {
            const userEmail = getUser(c); // This is the *editor*
            if (!userEmail) return c.json({ error: "Unauthorized" }, 401);

            const memoryId = c.req.param("id");
            const body = c.req.valid("json");

            if (Object.keys(body).length === 0) {
                  return c.json(
                        { error: "No fields provided for update" },
                        400
                  );
            }

            // Fetch original memory to check ownership (optional, request allows any user)
            // const { results: original } = await c.env.DB.prepare("SELECT user_id FROM memories WHERE id = ?").bind(memoryId).all();
            // if (!original || original.length === 0) return c.json({ error: "Memory not found" }, 404);
            // if (original[0].user_id !== userEmail) // Check if editor must be owner - skip per req.

            // Build SET clause dynamically
            const fieldsToUpdate: string[] = [];
            const bindings: any[] = [];

            Object.entries(body).forEach(([key, value]) => {
                  if (value !== undefined) {
                        // Only include fields present in the body
                        if (key === "tags") {
                              // Process tags like in POST
                              const tagsString = value
                                    ? value
                                            .split(",")
                                            .map((t) => t.trim().toLowerCase())
                                            .filter((t) => t.length > 0)
                                            .filter(
                                                  (v, i, self) =>
                                                        self.indexOf(v) === i
                                            )
                                            .join(",")
                                    : null;
                              fieldsToUpdate.push("tags = ?");
                              bindings.push(tagsString);
                        } else if (
                              key === "content" ||
                              key === "asset_key" ||
                              key === "caption" ||
                              key === "location"
                        ) {
                              // Handle potentially nullable fields
                              fieldsToUpdate.push(`${key} = ?`);
                              bindings.push(value === "" ? null : value); // Treat empty string as null for optional text fields
                        } else if (key === "type") {
                              fieldsToUpdate.push(`${key} = ?`);
                              bindings.push(value);
                        }
                        // Ignore fields not in the schema or not meant to be updated here (like id, user_id)
                  }
            });

            // Add update timestamp and editor
            fieldsToUpdate.push("updated_at = CURRENT_TIMESTAMP");
            fieldsToUpdate.push("edited_by = ?");
            bindings.push(userEmail); // The user performing the edit

            // Add the memory ID for the WHERE clause
            bindings.push(memoryId);

            if (fieldsToUpdate.length <= 2) {
                  // Only updated_at and edited_by added
                  return c.json(
                        { error: "No valid fields provided for update" },
                        400
                  );
            }

            const sql = `UPDATE memories SET ${fieldsToUpdate.join(
                  ", "
            )} WHERE id = ?`;

            try {
                  // console.log("Update SQL:", sql); // Debug
                  // console.log("Update Bindings:", bindings); // Debug
                  const info = await c.env.DB.prepare(sql)
                        .bind(...bindings)
                        .run();

                  if (info.success && info.meta.changes > 0) {
                        // Fetch the updated memory
                        const { results } = await c.env.DB.prepare(
                              "SELECT * FROM memories WHERE id = ?"
                        )
                              .bind(memoryId)
                              .all();
                        if (results && results.length > 0) {
                              return c.json({ memory: results[0] });
                        } else {
                              return c.json(
                                    {
                                          error: "Update succeeded but failed to retrieve updated memory.",
                                    },
                                    500
                              );
                        }
                  } else if (info.meta.changes === 0) {
                        return c.json(
                              { error: "Memory not found or no changes made" },
                              404
                        );
                  } else {
                        return c.json(
                              {
                                    error: "Failed to update memory",
                                    details: info.error,
                              },
                              500
                        );
                  }
            } catch (e: any) {
                  console.error("Error updating memory:", e);
                  return c.json(
                        {
                              error: "Failed to update memory",
                              details: e.message,
                        },
                        500
                  );
            }
      }
);

// Add this new endpoint
app.get("/api/auth/me", async (c) => {
      const userEmail = getUser(c);
      if (!userEmail) {
            return c.json({ authenticated: false }, 401);
      }
      return c.json({
            authenticated: true,
            email: userEmail,
      });
});

// Catch-all / Export (remains the same)
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));
export default app;
export const onRequest: PagesFunction<Bindings> = async (context) => {
      return app.fetch(
            context.request as unknown as Request,
            context.env,
            context
      ) as unknown as import("@cloudflare/workers-types").Response;
};
