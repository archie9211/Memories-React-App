// src/services/api.ts
import toast from "react-hot-toast";

// --- Interfaces matching backend response ---

// Represents a single asset associated with a memory
export interface MemoryAsset {
      id: string;
      memory_id: string;
      asset_key: string;
      thumbnail_key: string | null; // Key for thumbnail (esp. for images)
      asset_type: "image" | "video";
      sort_order: number;
}

// Updated Memory Interface (reflecting backend changes)
export interface Memory {
      id: string;
      user_id: string;
      type: "quote" | "image" | "video" | "hybrid" | "gallery"; // Added gallery
      content?: string | null; // For quote, hybrid
      assets?: MemoryAsset[]; // Array of assets for image, video, gallery
      caption?: string | null; // General caption/description
      location?: string | null;
      memory_date: string; // ISO string format
      created_at: string; // ISO string format
      updated_at?: string | null; // ISO string format
      edited_by?: string | null; // Editor's email
      tags?: string | null; // Comma-separated string from DB
}

// API response for fetching memories
export interface FetchMemoriesResponse {
      memories: Memory[];
      nextCursor: { date: string; id: string } | null;
}

// Filtering parameters (Unchanged)
export interface MemoryFilters {
      q?: string;
      location?: string;
      startDate?: string; // YYYY-MM-DD
      endDate?: string; // YYYY-MM-DD
      tags?: string; // Comma-separated
      limit?: number;
      cursorDate?: string; // ISO date string from last item
      cursorId?: string; // ID from last item
}

// Interface for media item in the global gallery
export interface GlobalMediaItem {
      asset_key: string;
      thumbnail_key: string | null;
      asset_type: "image" | "video";
      memory_date: string;
      memory_caption?: string | null;
}

// API response for global media gallery
export interface FetchAllMediaResponse {
      media: GlobalMediaItem[];
      // Add pagination info here if implemented (e.g., nextOffset, total)
}

const API_BASE = "/api";

// --- Helper for Error Handling (Unchanged) ---
const handleApiError = async (
      response: Response,
      defaultMessage: string
): Promise<void> => {
      let errorMessage = defaultMessage;
      try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
            if (errorData.details) {
                  errorMessage += ` (${errorData.details})`;
            }
      } catch (e) {
            /* Ignore */
      }
      console.error("API Error:", response.status, errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
};

// Fetch memories (Unchanged logic, relies on updated Memory interface)
export const fetchMemories = async (
      filters: MemoryFilters
): Promise<FetchMemoriesResponse> => {
      const params = new URLSearchParams();
      // ... (param appending logic remains the same) ...
      if (filters.q) params.append("q", filters.q);
      if (filters.location) params.append("location", filters.location);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.tags) params.append("tags", filters.tags);
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.cursorDate && filters.cursorId) {
            params.append("cursorDate", filters.cursorDate);
            params.append("cursorId", filters.cursorId);
      }

      const response = await fetch(`${API_BASE}/memories?${params.toString()}`);
      if (!response.ok)
            await handleApiError(response, "Failed to fetch memories");
      return response.json();
};

// Upload Asset Response (Includes potential thumbnail key)
interface UploadAssetResponse {
      key: string; // Original asset key
      thumbnailKey?: string | null; // Thumbnail key (if image)
}

// Upload asset (Expects thumbnailKey in response)
export const uploadAsset = async (file: File): Promise<UploadAssetResponse> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/assets`, {
            method: "POST",
            body: formData,
      });
      if (!response.ok) {
            await handleApiError(
                  response,
                  `Failed to upload ${file.type.split("/")[0] || "file"}`
            );
            throw new Error("Upload failed after handling API error."); // Ensure throw
      }
      return response.json(); // Expect { key: string, thumbnailKey?: string | null }
};

// Get Asset Path (Helper remains the same, works for any key)
export const getAssetPath = (
      assetKey: string | null | undefined
): string | null => {
      if (!assetKey) return null;
      const encodedKey = encodeURIComponent(assetKey);
      return `${API_BASE}/assets/${encodedKey}`;
};

// --- Payload Types for Add/Update ---

// Payload structure for a single asset when adding/updating
export interface AssetPayload {
      asset_key: string;
      thumbnail_key?: string | null;
      asset_type: "image" | "video";
      sort_order?: number;
}

// Add Memory Payload (Reflects backend schema)
export interface AddMemoryPayload {
      type: "quote" | "image" | "video" | "hybrid" | "gallery";
      content?: string | null;
      assets?: AssetPayload[]; // Array of assets for image, video, gallery
      caption?: string | null;
      location?: string | null;
      memory_date: string; // ISO 8601 format
      tags?: string | null; // Comma-separated string
}

export type UpdateMemoryPayload = Omit<Partial<AddMemoryPayload>, "">;

// Add Memory (Adjusted payload)
export const addMemory = async (payload: AddMemoryPayload): Promise<Memory> => {
      const response = await fetch(`${API_BASE}/memories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
      });
      if (!response.ok) await handleApiError(response, "Failed to add memory");
      const data = await response.json();
      toast.success("Memory added!");
      return data.memory; // Expects the full memory object back
};

// Update Memory (Adjusted payload, simplified endpoint functionality)
export const updateMemory = async (
      id: string,
      payload: UpdateMemoryPayload
): Promise<Memory> => {
      // Note: This PATCH currently only updates metadata in the backend implementation.
      const response = await fetch(`${API_BASE}/memories/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
      });
      if (!response.ok)
            await handleApiError(response, "Failed to update memory");
      const data = await response.json();
      toast.success("Memory updated!");
      return data.memory; // Expects the full memory object back (including potentially unchanged assets)
};

// --- New function for Global Media Gallery ---
export const fetchAllMedia = async (): Promise<FetchAllMediaResponse> => {
      // Add pagination parameters here if implemented (e.g., limit, offset/cursor)
      const response = await fetch(`${API_BASE}/all-media`); // Add params if needed
      if (!response.ok)
            await handleApiError(response, "Failed to fetch media gallery");
      return response.json(); // Expects { media: GlobalMediaItem[] }
};

// getAssetViewUrl - Likely NO LONGER NEEDED if using direct /api/assets/:key paths
// export const getAssetViewUrl = async (assetKey: string): Promise<string> => { ... }

// getUserInfo - Optional, keep if needed
// export const getUserInfo = async (): Promise<{ email: string | null }> => { ... }
