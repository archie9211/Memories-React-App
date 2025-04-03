// functions/api/[[path]].ts
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
      D1PreparedStatement,
} from "@cloudflare/workers-types";

import { Jimp, JimpMime } from "jimp"; // Use named exports as per the types

// --- Constants for Thumbnail Generation ---
const THUMBNAIL_WIDTH = 400; // Target width in pixels
const THUMBNAIL_QUALITY = 75; // JPEG quality (0-100)
// Use the MIME constant from the imported JimpMime
const THUMBNAIL_MIME_TYPE = JimpMime.jpeg; // "image/jpeg"
const THUMBNAIL_EXTENSION = ".jpg"; // Extension matching the MIME type

// --- Types ---
type Bindings = {
      FOOTER_TEXT: string;
      APP_TITLE: string;
      DB: D1Database;
      ASSETS_BUCKET: R2Bucket;
};

interface AccessJwtPayload {
      email: string;
}

// Asset structure as stored/retrieved
interface MemoryAsset {
      id: string;
      memory_id: string;
      asset_key: string;
      thumbnail_key: string | null;
      asset_type: "image" | "video";
      sort_order: number;
}

// Memory structure returned by the API
interface ApiMemory {
      id: string;
      user_id: string;
      type: "quote" | "image" | "video" | "hybrid" | "gallery";
      content?: string | null;
      // asset_key?: string | null; // Removed
      // thumbnail_key?: string | null; // Removed
      assets?: MemoryAsset[]; // Added for gallery/image/video types
      caption?: string | null;
      location?: string | null;
      memory_date: string;
      created_at: string;
      updated_at?: string | null;
      edited_by?: string | null;
      tags?: string | null;
}

// --- Helper Functions ---
const getUser = (c: any): string | null => {
      return "developer@example.com"; // Hardcoded for development/testing

      // Replace with actual Cloudflare Access header reading in production
      const email = c.req.header("cf-access-authenticated-user-email");
      return email || null;
};

// --- Hono App Setup ---
const app = new Hono<{ Bindings: Bindings }>();
app.use("/api/*", cors()); // Keep CORS for local dev

// --- API Endpoints ---

// GET /api/config (Unchanged)
app.get("/api/config", (c) => {
      const title = c.env.APP_TITLE || "Our Memories";
      const footer = c.env.FOOTER_TEXT || `© ${new Date().getFullYear()}`;
      return c.json({ appTitle: title, footerText: footer });
});

// POST /api/assets - Updated with Jimp processing based on provided types
app.post("/api/assets", async (c) => {
      const userEmail = getUser(c);
      if (!userEmail) {
            return c.json({ error: "Unauthorized" }, 401);
      }

      try {
            const formData = await c.req.formData();
            const file = formData.get("file") as File | null;

            if (!file || !(file instanceof File)) {
                  return c.json({ error: "File data invalid." }, 400);
            }

            const MAX_SIZE_MB = 100;
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                  return c.json(
                        { error: `File exceeds ${MAX_SIZE_MB} MB limit.` },
                        413
                  );
            }

            // Check if it's a type Jimp can likely process (excluding SVG, check GIF support if needed)
            const processableImageTypes = [
                  JimpMime.png,
                  JimpMime.jpeg,
                  JimpMime.bmp,
                  JimpMime.tiff,
            ]; // Add JimpMime.gif if desired/tested
            const isProcessableImage = processableImageTypes.includes(
                  file.type as any
            );

            let thumbnailKey: string | null = null;
            const originalBuffer = await file.arrayBuffer(); // Get buffer for original upload

            // Generate unique key for the original asset
            const sanitizedFileName = file.name
                  .replace(/[^a-zA-Z0-9.]+/g, "-")
                  .replace(/\.[^.]+$/, ""); // Remove extension for base key
            const fileExtension = file.name.includes(".")
                  ? file.name.substring(file.name.lastIndexOf("."))
                  : "";
            const uniqueKey = `${crypto.randomUUID()}-${sanitizedFileName}${fileExtension}`;

            // 1. Upload Original File (Do this first)
            await c.env.ASSETS_BUCKET.put(uniqueKey, originalBuffer, {
                  httpMetadata: {
                        contentType: file.type || "application/octet-stream",
                        cacheControl: "public, max-age=31536000, immutable",
                  },
            });
            console.log(`Uploaded original: ${uniqueKey}`);

            // 2. Generate and Upload Thumbnail (if it's a processable image)
            if (isProcessableImage) {
                  console.log(
                        `Attempting to generate thumbnail for: ${uniqueKey} (Type: ${file.type})`
                  );
                  try {
                        // Load image using Jimp.read (static method)
                        // The types indicate Jimp.read takes Buffer | ArrayBuffer directly
                        const image = await Jimp.read(originalBuffer);

                        // Resize - Assuming Jimp.AUTO constant exists or use -1
                        // The resize plugin is in defaultPlugins, so instance method should work
                        image.resize({ w: THUMBNAIL_WIDTH });

                        // Get buffer for the thumbnail using the specific MIME type and quality option
                        // The types show getBuffer returns a Promise<Buffer>
                        // Pass quality within the options object for JPEG
                        const thumbnailBuffer = await image.getBuffer(
                              THUMBNAIL_MIME_TYPE,
                              { quality: THUMBNAIL_QUALITY }
                        );

                        // Generate thumbnail key using the correct extension
                        thumbnailKey = `thumb-${crypto.randomUUID()}-${sanitizedFileName}${THUMBNAIL_EXTENSION}`;

                        // Upload thumbnail to R2
                        await c.env.ASSETS_BUCKET.put(
                              thumbnailKey,
                              thumbnailBuffer,
                              {
                                    httpMetadata: {
                                          contentType: THUMBNAIL_MIME_TYPE,
                                          cacheControl:
                                                "public, max-age=31536000, immutable",
                                    },
                              }
                        );
                        console.log(
                              `Successfully generated and uploaded thumbnail: ${thumbnailKey}`
                        );
                  } catch (jimpError: any) {
                        console.error(
                              `Jimp Error processing ${uniqueKey}:`,
                              jimpError.message || jimpError
                        );
                        thumbnailKey = null; // Ensure thumbnailKey is null if processing failed
                  }
            } else {
                  console.log(
                        `Skipping thumbnail generation for non-processable type: ${file.type}`
                  );
            }

            // 3. Return keys
            return c.json({ key: uniqueKey, thumbnailKey: thumbnailKey });
      } catch (e: any) {
            console.error("Error in /api/assets handler:", e);
            return c.json(
                  {
                        error: "Failed to process asset",
                        details: e.message || "Unknown error",
                  },
                  500
            );
      }
});

// GET /api/assets/:key (Unchanged - serves the requested key)
app.get("/api/assets/:key{.+}", async (c) => {
      const userEmail = getUser(c); // Check auth if assets should be private
      if (!userEmail) {
            return new Response("Unauthorized", { status: 401 });
      }
      const key = c.req.param("key");

      try {
            const object: R2ObjectBody | null = await c.env.ASSETS_BUCKET.get(
                  key
            );
            if (object === null) {
                  return new Response("Object Not Found", { status: 404 });
            }
            const headers = new Headers();
            object.writeHttpMetadata(
                  headers as unknown as import("@cloudflare/workers-types").Headers
            );
            headers.set("etag", object.httpEtag);
            return new Response(
                  object.body
                        ? (object.body as unknown as ReadableStream)
                        : null,
                  { headers }
            );
      } catch (e: any) {
            console.error(`Error fetching asset ${key}:`, e);
            return new Response("Internal Server Error", { status: 500 });
      }
});

// --- Memory Endpoints ---

// Helper to build WHERE clause for GET /memories (Updated for new schema)
function buildWhereClause(params: Record<string, string | undefined>): {
      clause: string;
      bindings: any[];
} {
      let conditions: string[] = [];
      let bindings: any[] = [];
      const prefix = "m."; // Alias for memories table

      if (params.q) {
            conditions.push(
                  `(${prefix}content LIKE ? OR ${prefix}caption LIKE ? OR ${prefix}location LIKE ? OR ${prefix}tags LIKE ?)`
            );
            const searchTerm = `%${params.q}%`;
            bindings.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      if (params.location) {
            conditions.push(`${prefix}location LIKE ?`);
            bindings.push(`%${params.location}%`);
      }
      if (params.startDate) {
            conditions.push(`${prefix}memory_date >= ?`);
            bindings.push(params.startDate);
      }
      if (params.endDate) {
            let endDateVal = params.endDate;
            if (endDateVal && endDateVal.length === 10) {
                  endDateVal = `${endDateVal}T23:59:59.999Z`;
            }
            conditions.push(`${prefix}memory_date <= ?`);
            bindings.push(endDateVal);
      }
      if (params.tags) {
            const tagsToSearch = params.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean);
            if (tagsToSearch.length > 0) {
                  const tagConditions = tagsToSearch.map(
                        () => `${prefix}tags LIKE ?`
                  );
                  conditions.push(`(${tagConditions.join(" AND ")})`);
                  bindings.push(...tagsToSearch.map((tag) => `%${tag}%`));
            }
      }
      // Cursor Pagination
      if (params.cursorDate && params.cursorId) {
            conditions.push(
                  `(${prefix}memory_date < ? OR (${prefix}memory_date = ? AND ${prefix}id < ?))`
            );
            bindings.push(
                  params.cursorDate,
                  params.cursorDate,
                  params.cursorId
            );
      }

      return {
            clause:
                  conditions.length > 0
                        ? `WHERE ${conditions.join(" AND ")}`
                        : "",
            bindings: bindings,
      };
}

// GET /api/memories (Updated to fetch assets)
app.get("/api/memories", async (c) => {
      const userEmail = getUser(c);
      if (!userEmail) return c.json({ error: "Unauthorized" }, 401);

      const limit = parseInt(c.req.query("limit") || "10", 10);
      const queryParams = {
            /* ... collect params ... */ q: c.req.query("q"),
            location: c.req.query("location"),
            startDate: c.req.query("startDate"),
            endDate: c.req.query("endDate"),
            tags: c.req.query("tags"),
            cursorDate: c.req.query("cursorDate"),
            cursorId: c.req.query("cursorId"),
      };

      const { clause, bindings } = buildWhereClause(queryParams);

      // Fetch memories matching criteria + 1 for cursor
      const memoriesSql = `
          SELECT m.*
          FROM memories m
          ${clause}
          ORDER BY m.memory_date DESC, m.id DESC
          LIMIT ?`;

      try {
            const { results: memoryResults } = await c.env.DB.prepare(
                  memoriesSql
            )
                  .bind(...bindings, limit + 1)
                  .all<ApiMemory>(); // Specify expected type

            if (!memoryResults || memoryResults.length === 0) {
                  return c.json({ memories: [], nextCursor: null });
            }

            let memories = memoryResults;
            let nextCursor: { date: string; id: string } | null = null;

            if (memories.length > limit) {
                  const cursorMemory = memories[limit];
                  nextCursor = {
                        date: cursorMemory.memory_date,
                        id: cursorMemory.id,
                  };
                  memories = memories.slice(0, limit); // Trim extra memory
            }

            // Get memory IDs to fetch associated assets
            const memoryIds = memories.map((m) => m.id);

            if (memoryIds.length > 0) {
                  // Fetch all assets for the selected memories
                  const assetsSql = `
                SELECT *
                FROM memory_assets
                WHERE memory_id IN (${memoryIds.map(() => "?").join(",")})
                ORDER BY memory_id, sort_order ASC`; // Ensure consistent order

                  const { results: assetResults } = await c.env.DB.prepare(
                        assetsSql
                  )
                        .bind(...memoryIds)
                        .all<MemoryAsset>();

                  // Group assets by memory_id
                  const assetsByMemoryId = (assetResults || []).reduce(
                        (acc, asset) => {
                              if (!acc[asset.memory_id]) {
                                    acc[asset.memory_id] = [];
                              }
                              acc[asset.memory_id].push(asset);
                              return acc;
                        },
                        {} as Record<string, MemoryAsset[]>
                  );

                  // Attach assets to memories
                  memories = memories.map((memory) => ({
                        ...memory,
                        assets: assetsByMemoryId[memory.id] || [], // Attach assets or empty array
                  }));
            } else {
                  // Ensure memories have an empty assets array if no IDs were found (shouldn't happen if memories exist)
                  memories = memories.map((memory) => ({
                        ...memory,
                        assets: [],
                  }));
            }

            return c.json({
                  memories: memories,
                  nextCursor: nextCursor,
            });
      } catch (e: any) {
            console.error("Error fetching memories:", e);
            return c.json(
                  { error: "Failed to fetch memories", details: e.message },
                  500
            );
      }
});

const assetSchema = z.object({
      asset_key: z.string().min(1),
      thumbnail_key: z.string().optional().nullable(),
      asset_type: z.enum(["image", "video"]),
      sort_order: z.number().int().optional().default(0),
});

const addMemorySchema = z.object({
      type: z.enum(["quote", "image", "video", "hybrid", "gallery"]),
      content: z.string().optional().nullable(),
      assets: z.array(assetSchema).optional().default([]), // Used for image, video, gallery
      caption: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      memory_date: z.string().datetime(),
      tags: z.string().optional().nullable(),
});

// POST /api/memories (Updated for gallery and assets table)
app.post("/api/memories", zValidator("json", addMemorySchema), async (c) => {
      const userEmail = getUser(c);
      if (!userEmail) return c.json({ error: "Unauthorized" }, 401);

      const body = c.req.valid("json");
      const memoryId = crypto.randomUUID();

      // --- Validation ---
      if (body.type === "quote" && !body.content?.trim())
            return c.json({ error: "Content required for quote" }, 400);
      if (body.type === "hybrid" && !body.content?.trim())
            return c.json({ error: "Content required for hybrid" }, 400);
      if (
            (body.type === "image" || body.type === "video") &&
            body.assets.length !== 1
      )
            return c.json(
                  { error: `Exactly one asset required for type ${body.type}` },
                  400
            );
      if (body.type === "gallery" && body.assets.length === 0)
            return c.json(
                  { error: "At least one asset required for gallery" },
                  400
            );
      if (body.type === "quote" && body.assets.length > 0)
            return c.json({ error: "Assets not allowed for quote" }, 400);
      if (body.type === "hybrid" && body.assets.length > 0)
            return c.json({ error: "Assets not allowed for hybrid" }, 400);

      // Process tags
      const tagsString = body.tags
            ? body.tags
                    .split(",")
                    .map((t) => t.trim().toLowerCase())
                    .filter(Boolean)
                    .filter((v, i, self) => self.indexOf(v) === i)
                    .join(",")
            : null;

      try {
            // Use a transaction to insert memory and its assets
            const statements: D1PreparedStatement[] = [];

            // 1. Insert into memories table
            statements.push(
                  c.env.DB.prepare(
                        `INSERT INTO memories (id, user_id, type, content, caption, location, memory_date, tags, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
                  ).bind(
                        memoryId,
                        userEmail,
                        body.type,
                        body.content ?? null,
                        body.caption ?? null,
                        body.location ?? null,
                        body.memory_date,
                        tagsString
                  )
            );

            // 2. Insert into memory_assets if applicable
            if (body.assets && body.assets.length > 0) {
                  body.assets.forEach((asset, index) => {
                        statements.push(
                              c.env.DB.prepare(
                                    `INSERT INTO memory_assets (id, memory_id, asset_key, thumbnail_key, asset_type, sort_order)
                             VALUES (?, ?, ?, ?, ?, ?)`
                              ).bind(
                                    crypto.randomUUID(), // Unique ID for the asset link
                                    memoryId,
                                    asset.asset_key,
                                    asset.thumbnail_key ?? null,
                                    asset.asset_type,
                                    asset.sort_order ?? index // Use provided order or index
                              )
                        );
                  });
            }

            // Execute batch transaction
            const batchResult = await c.env.DB.batch(statements);

            // Check if all statements succeeded (D1 batch doesn't provide detailed success per statement easily)
            // A simple check: if batchResult exists and has length, assume success for now.
            // Robust check would involve error handling within the batch if supported, or verifying inserts after.
            if (batchResult) {
                  // Fetch the newly created memory WITH its assets to return
                  const { results: newMemoryResults } = await c.env.DB.prepare(
                        "SELECT * FROM memories WHERE id = ?"
                  )
                        .bind(memoryId)
                        .all<ApiMemory>();

                  if (newMemoryResults && newMemoryResults.length > 0) {
                        const newMemory = newMemoryResults[0];
                        // Fetch its assets separately
                        const { results: newAssetResults } =
                              await c.env.DB.prepare(
                                    "SELECT * FROM memory_assets WHERE memory_id = ? ORDER BY sort_order ASC"
                              )
                                    .bind(memoryId)
                                    .all<MemoryAsset>();
                        newMemory.assets = newAssetResults || [];

                        return c.json({ memory: newMemory }, 201);
                  } else {
                        return c.json(
                              {
                                    error: "Memory created but could not retrieve.",
                              },
                              500
                        );
                  }
            } else {
                  console.error("D1 Batch Error:", batchResult); // Log if possible
                  return c.json(
                        {
                              error: "Failed to add memory (batch operation failed)",
                        },
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

// Update Schema: Allow all fields to be optional for PATCH, including 'assets'
const updateMemorySchema = addMemorySchema.partial(); // Make all fields optional

// PATCH /api/memories/:id
app.patch(
      "/api/memories/:id",
      zValidator("json", updateMemorySchema),
      async (c) => {
            const userEmail = getUser(c);
            if (!userEmail) return c.json({ error: "Unauthorized" }, 401);

            const memoryId = c.req.param("id");
            const body = c.req.valid("json");

            if (Object.keys(body).length === 0) {
                  return c.json(
                        { error: "No fields provided for update" },
                        400
                  );
            }

            // --- Pre-computation and Validation ---
            const updateMetadataFields: Record<string, any> = {};
            const metadataBindings: any[] = [];
            // Explicitly check if 'assets' key exists in the body, even if its value is null or []
            const updateAssets = Object.prototype.hasOwnProperty.call(
                  body,
                  "assets"
            );

            // 1. Fetch current memory type
            const { results: existing } = await c.env.DB.prepare(
                  "SELECT type FROM memories WHERE id = ?"
            )
                  .bind(memoryId)
                  .all<{ type: string }>();

            if (!existing || existing.length === 0) {
                  return c.json({ error: "Memory not found" }, 404);
            }
            const existingType = existing[0].type;
            const finalType = body.type || existingType; // Determine the type after potential update

            // 2. Process Non-Asset Fields & Validate Type Change
            Object.entries(body).forEach(([key, value]) => {
                  if (key === "assets") return; // Skip assets here

                  if (value !== undefined) {
                        if (key === "type") {
                              // Validate type change attempt
                              if (
                                    value !== existingType &&
                                    (["image", "video", "gallery"].includes(
                                          existingType
                                    ) ||
                                          [
                                                "image",
                                                "video",
                                                "gallery",
                                          ].includes(value as string))
                              ) {
                                    throw new Error(
                                          "Changing memory type to/from asset types is not supported via PATCH."
                                    );
                              }
                              updateMetadataFields[key] = value;
                              metadataBindings.push(value);
                        } else if (key === "tags") {
                              const tagsString = value
                                    ? (value as string)
                                            .split(",")
                                            .map((t) => t.trim().toLowerCase())
                                            .filter(Boolean)
                                            .filter(
                                                  (v, i, self) =>
                                                        self.indexOf(v) === i
                                            )
                                            .join(",")
                                    : null;
                              updateMetadataFields[key] = tagsString;
                              metadataBindings.push(tagsString);
                        } else if (
                              [
                                    "content",
                                    "caption",
                                    "location",
                                    "memory_date",
                              ].includes(key)
                        ) {
                              updateMetadataFields[key] =
                                    value === "" ? null : value;
                              metadataBindings.push(
                                    value === "" ? null : value
                              );
                        }
                  }
            });

            // 3. Validate Asset Consistency ONLY IF assets were provided in the payload
            if (updateAssets) {
                  // Use the assets array *from the body* for validation. Default to empty if body.assets is null/undefined.
                  const assetsPayload = body.assets || [];

                  console.log(
                        `Validating assets for PATCH. Final type: ${finalType}, Provided assets count: ${assetsPayload.length}`
                  ); // Debugging

                  if (finalType === "quote" && assetsPayload.length > 0)
                        throw new Error("Assets not allowed for type 'quote'.");
                  if (finalType === "hybrid" && assetsPayload.length > 0)
                        throw new Error(
                              "Assets not allowed for type 'hybrid'."
                        );
                  // ** This is the key check that was failing **
                  if (
                        (finalType === "image" || finalType === "video") &&
                        assetsPayload.length !== 1
                  ) {
                        throw new Error(
                              `Exactly one asset required for type '${finalType}' when updating assets.`
                        );
                  }
                  // For gallery, require at least one asset *only if* the assets array was provided
                  if (finalType === "gallery" && assetsPayload.length === 0) {
                        throw new Error(
                              "At least one asset required for type 'gallery' when updating assets."
                        );
                  }
            }
            // --- End Validation ---

            // --- Prepare D1 Batch Statements ---
            const statements: D1PreparedStatement[] = [];
            let metadataUpdatePerformed = false;

            // 4. Prepare Metadata Update Statement
            if (Object.keys(updateMetadataFields).length > 0) {
                  const setClauses = Object.keys(updateMetadataFields).map(
                        (key) => `${key} = ?`
                  );
                  setClauses.push(
                        "updated_at = CURRENT_TIMESTAMP",
                        "edited_by = ?"
                  );
                  metadataBindings.push(userEmail, memoryId);
                  const updateMemoriesSql = `UPDATE memories SET ${setClauses.join(
                        ", "
                  )} WHERE id = ?`;
                  statements.push(
                        c.env.DB.prepare(updateMemoriesSql).bind(
                              ...metadataBindings
                        )
                  );
                  metadataUpdatePerformed = true;
            } else if (updateAssets) {
                  // If only assets changed, still update timestamp/editor
                  const updateTimestampSql = `UPDATE memories SET updated_at = CURRENT_TIMESTAMP, edited_by = ? WHERE id = ?`;
                  statements.push(
                        c.env.DB.prepare(updateTimestampSql).bind(
                              userEmail,
                              memoryId
                        )
                  );
                  metadataUpdatePerformed = true;
            }

            // 5. Prepare Asset Update Statements (if 'assets' key was present)
            if (updateAssets) {
                  statements.push(
                        c.env.DB.prepare(
                              "DELETE FROM memory_assets WHERE memory_id = ?"
                        ).bind(memoryId)
                  );
                  const assetsToInsert = body.assets || []; // Use payload assets (can be empty)
                  assetsToInsert.forEach((asset, index) => {
                        statements.push(
                              c.env.DB.prepare(
                                    `INSERT INTO memory_assets (id, memory_id, asset_key, thumbnail_key, asset_type, sort_order)
                            VALUES (?, ?, ?, ?, ?, ?)`
                              ).bind(
                                    crypto.randomUUID(),
                                    memoryId,
                                    asset.asset_key,
                                    asset.thumbnail_key ?? null,
                                    asset.asset_type,
                                    asset.sort_order ?? index
                              )
                        );
                  });
            }

            // 6. Check if any update operation exists
            if (statements.length === 0) {
                  console.log(
                        `No update statements generated for PATCH /api/memories/${memoryId}. Returning current state.`
                  );
                  // Re-fetch current state (as before)
                  const { results: currentMemoryResults } =
                        await c.env.DB.prepare(
                              "SELECT * FROM memories WHERE id = ?"
                        )
                              .bind(memoryId)
                              .all<ApiMemory>();
                  if (
                        !currentMemoryResults ||
                        currentMemoryResults.length === 0
                  )
                        return c.json({ error: "Memory not found" }, 404); // Should not happen if initial check passed
                  const currentMemory = currentMemoryResults[0];
                  const { results: currentAssetResults } =
                        await c.env.DB.prepare(
                              "SELECT * FROM memory_assets WHERE memory_id = ? ORDER BY sort_order ASC"
                        )
                              .bind(memoryId)
                              .all<MemoryAsset>();
                  currentMemory.assets = currentAssetResults || [];
                  return c.json({ memory: currentMemory });
            }

            // --- Execute Batch Transaction ---
            try {
                  console.log(
                        `Executing D1 Batch for PATCH /api/memories/${memoryId}. Statements: ${statements.length}`
                  );
                  const batchResult = await c.env.DB.batch(statements);
                  const allSucceeded =
                        batchResult && batchResult.every((r) => r.success);

                  if (allSucceeded) {
                        // Fetch the fully updated memory (as before)
                        const { results: updatedMemoryResults } =
                              await c.env.DB.prepare(
                                    "SELECT * FROM memories WHERE id = ?"
                              )
                                    .bind(memoryId)
                                    .all<ApiMemory>();
                        if (
                              !updatedMemoryResults ||
                              updatedMemoryResults.length === 0
                        )
                              throw new Error(
                                    "Update succeeded but failed retrieve."
                              );
                        const updatedMemory = updatedMemoryResults[0];
                        const { results: assetResults } =
                              await c.env.DB.prepare(
                                    "SELECT * FROM memory_assets WHERE memory_id = ? ORDER BY sort_order ASC"
                              )
                                    .bind(memoryId)
                                    .all<MemoryAsset>();
                        updatedMemory.assets = assetResults || [];
                        return c.json({ memory: updatedMemory });
                  } else {
                        console.error("D1 Batch Error:", batchResult);
                        const firstError =
                              batchResult?.find((r) => !r.success)?.error ||
                              "Unknown D1 batch error";
                        return c.json(
                              {
                                    error: "Failed to update memory (batch operation failed)",
                                    details: firstError,
                              },
                              500
                        );
                  }
            } catch (e: any) {
                  console.error("Error during D1 batch execution:", e);
                  return c.json(
                        {
                              error: "Failed to update memory",
                              details: e.message || "Unknown error",
                        },
                        500
                  );
            }
      } // End of async (c) =>
); // End of app.patch

// GET /api/all-media - New endpoint for global gallery view
app.get("/api/all-media", async (c) => {
      const userEmail = getUser(c);
      if (!userEmail) return c.json({ error: "Unauthorized" }, 401);

      // Simple version: Fetch all unique image/video assets with associated memory date
      // TODO: Add pagination in a real application (LIMIT/OFFSET or cursor)
      const sql = `
        SELECT DISTINCT
            ma.asset_key,
            ma.thumbnail_key,
            ma.asset_type,
            m.memory_date,
            m.caption as memory_caption -- Include memory caption for context
        FROM memory_assets ma
        JOIN memories m ON ma.memory_id = m.id
        WHERE ma.asset_type IN ('image', 'video')
        ORDER BY m.memory_date DESC`;
      // Add LIMIT ? OFFSET ? here for pagination

      try {
            const { results } = await c.env.DB.prepare(sql).all();
            return c.json({ media: results || [] });
      } catch (e: any) {
            console.error("Error fetching all media:", e);
            return c.json(
                  { error: "Failed to fetch media", details: e.message },
                  500
            );
      }
});

// GET /api/auth/me (Unchanged)
app.get("/api/auth/me", async (c) => {
      const userEmail = getUser(c);
      if (!userEmail) {
            return c.json({ authenticated: false }, 401);
      }
      return c.json({ authenticated: true, email: userEmail });
});

// --- Catch-all & Export ---
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));
export default app; // Keep if using Hono's default export

// Use PagesFunction export style for Cloudflare Pages Functions
export const onRequest: PagesFunction<Bindings> = async (context) => {
      return app.fetch(
            context.request as unknown as Request,
            context.env,
            context
      ) as unknown as import("@cloudflare/workers-types").Response;
};
