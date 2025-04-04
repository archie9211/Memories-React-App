// src/components/AddMemoryForm.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import Select from "react-select/creatable";
import {
      AddMemoryPayload,
      Memory,
      UpdateMemoryPayload,
      AssetPayload, // Use payload interface
      addMemory,
      updateMemory,
      uploadAsset,
} from "../services/api";
import HybridEditor from "./HybridEditor";
import toast from "react-hot-toast";
import {
      XCircleIcon,
      ArrowUpTrayIcon,
      PhotoIcon,
      VideoCameraIcon,
} from "@heroicons/react/24/solid"; // For better UI

interface AddMemoryFormProps {
      onMemorySaved: (savedMemory: Memory) => void;
      existingMemory?: Memory | null;
      onCancel: () => void;
}

type MemoryType = "quote" | "image" | "video" | "hybrid" | "gallery";

interface TagOption {
      readonly label: string;
      readonly value: string;
}
const createOption = (label: string): TagOption => ({
      label,
      value: label.toLowerCase().trim(),
});

// State for managing file uploads, especially for gallery
interface UploadProgress {
      file: File;
      status: "pending" | "uploading" | "success" | "error";
      key?: string; // Original key
      thumbnailKey?: string | null;
      error?: string;
      id: string; // Unique ID for list rendering
}

const AddMemoryForm: React.FC<AddMemoryFormProps> = ({
      onMemorySaved,
      existingMemory = null,
      onCancel,
}) => {
      const isEditMode = !!existingMemory;
      // --- State Initialization ---
      const [memoryType, setMemoryType] = useState<MemoryType>(
            existingMemory?.type || "quote"
      );
      const [content, setContent] = useState(existingMemory?.content || "");
      const [caption, setCaption] = useState(existingMemory?.caption || "");
      const [location, setLocation] = useState(existingMemory?.location || "");
      const [isProcessingQueue, setIsProcessingQueue] = useState(false);

      const initialDate = existingMemory?.memory_date
            ? new Date(existingMemory.memory_date).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16);
      const [memoryDate, setMemoryDate] = useState(initialDate);
      const [tags, setTags] = useState<readonly TagOption[]>(
            existingMemory?.tags
                  ? existingMemory.tags.split(",").map(createOption)
                  : []
      );
      const [tagInputValue, setTagInputValue] = useState("");

      // State specific to file uploads / gallery
      const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
      const [uploadedAssets, setUploadedAssets] = useState<AssetPayload[]>(
            // Initialize with existing assets if editing image/video/gallery
            isEditMode && existingMemory?.assets
                  ? existingMemory.assets.map((a) => ({
                          asset_key: a.asset_key,
                          thumbnail_key: a.thumbnail_key,
                          asset_type: a.asset_type,
                          sort_order: a.sort_order,
                    }))
                  : []
      );

      const [isSubmitting, setIsSubmitting] = useState(false);
      const fileInputRef = useRef<HTMLInputElement>(null);

      // Derive if uploads are in progress
      const isUploading = uploadQueue.some((u) => u.status === "uploading");

      // --- Effects ---
      // Reset form state if existingMemory changes (e.g., closing and reopening modal for different memory)
      useEffect(() => {
            setMemoryType(existingMemory?.type || "quote");
            setContent(existingMemory?.content || "");
            setCaption(existingMemory?.caption || "");
            setLocation(existingMemory?.location || "");
            setMemoryDate(
                  existingMemory?.memory_date
                        ? new Date(existingMemory.memory_date)
                                .toISOString()
                                .slice(0, 16)
                        : new Date().toISOString().slice(0, 16)
            );
            setTags(
                  existingMemory?.tags
                        ? existingMemory.tags.split(",").map(createOption)
                        : []
            );
            setUploadedAssets(
                  existingMemory?.assets
                        ? existingMemory.assets.map((a) => ({
                                asset_key: a.asset_key,
                                thumbnail_key: a.thumbnail_key,
                                asset_type: a.asset_type,
                                sort_order: a.sort_order,
                          }))
                        : []
            );
            setUploadQueue([]); // Clear queue on memory change
            setIsSubmitting(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input visually
      }, [existingMemory]);

      // --- File Handling ---
      const handleFileSelected = (
            event: React.ChangeEvent<HTMLInputElement>
      ) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            const newUploads: UploadProgress[] = Array.from(files).map(
                  (file) => ({
                        file,
                        status: "pending",
                        id: crypto.randomUUID(), // Unique ID for each upload item
                  })
            );

            // For single image/video, replace queue and existing assets
            if (memoryType === "image" || memoryType === "video") {
                  setUploadQueue(newUploads.slice(0, 1)); // Only take the first file
                  setUploadedAssets([]); // Clear previously uploaded asset if replacing
            } else if (memoryType === "gallery") {
                  setUploadQueue((prev) => [...prev, ...newUploads]);
            }

            // Clear the file input visually after selection
            if (fileInputRef.current) {
                  fileInputRef.current.value = "";
            }
      };

      // Function to trigger upload for pending files
      const processQueueSequentially = useCallback(async () => {
            // Find the next pending upload
            const nextUploadIndex = uploadQueue.findIndex(
                  (u) => u.status === "pending"
            );

            // If no pending uploads or already processing, stop.
            if (nextUploadIndex === -1 || isProcessingQueue) {
                  if (nextUploadIndex === -1) {
                        setIsProcessingQueue(false); // Ensure flag is reset if queue is empty
                  }
                  return;
            }

            setIsProcessingQueue(true); // Mark as processing
            const upload = uploadQueue[nextUploadIndex];

            // Update status to 'uploading' for UI feedback
            setUploadQueue((prev) =>
                  prev.map((u) =>
                        u.id === upload.id ? { ...u, status: "uploading" } : u
                  )
            );

            try {
                  console.log(
                        `Uploading file sequentially: ${upload.file.name}`
                  ); // Log start
                  const response = await uploadAsset(upload.file);
                  const newAsset: AssetPayload = {
                        asset_key: response.key,
                        thumbnail_key: response.thumbnailKey,
                        asset_type: upload.file.type.startsWith("image/")
                              ? "image"
                              : "video",
                  };
                  setUploadedAssets((prev) => [...prev, newAsset]);
                  // Update status to 'success'
                  setUploadQueue((prev) =>
                        prev.map((u) =>
                              u.id === upload.id
                                    ? {
                                            ...u,
                                            status: "success",
                                            key: response.key,
                                            thumbnailKey: response.thumbnailKey,
                                      }
                                    : u
                        )
                  );
            } catch (error: any) {
                  console.error(
                        `Sequential upload error for ${upload.file.name}:`,
                        error
                  );
                  // Update status to 'error'
                  setUploadQueue((prev) =>
                        prev.map((u) =>
                              u.id === upload.id
                                    ? {
                                            ...u,
                                            status: "error",
                                            error:
                                                  error.message ||
                                                  "Upload failed",
                                      }
                                    : u
                        )
                  );
                  // Show specific toast for the failed file
                  toast.error(
                        `Failed to upload ${upload.file.name}: ${
                              error.message || "Unknown error"
                        }`
                  );
            } finally {
                  setIsProcessingQueue(false); // Allow next item to be processed
                  // Trigger processing the *next* item shortly after, allowing UI to update
                  // setTimeout(() => processQueueSequentially(), 100); // Small delay might help UI responsiveness
                  // Or trigger immediately if batching many small files:
                  // processQueueSequentially(); // <-- Recursive call might be okay here, but ensure state updates first
                  // Safer approach: useEffect dependency below handles this.
            }
      }, [uploadQueue, isProcessingQueue]); // Dependencies

      // Trigger processing whenever the queue changes and we're not already processing
      useEffect(() => {
            if (
                  !isProcessingQueue &&
                  uploadQueue.some((u) => u.status === "pending")
            ) {
                  processQueueSequentially();
            }
            // Log queue status changes
            console.log(
                  "Upload Queue Status:",
                  uploadQueue.map((u) => ({
                        name: u.file.name,
                        status: u.status,
                  }))
            );
      }, [uploadQueue, isProcessingQueue, processQueueSequentially]);

      const removeUploadItem = (idToRemove: string) => {
            setUploadQueue((prev) => prev.filter((u) => u.id !== idToRemove));
            // Also remove from successfully uploaded assets if it finished
            const itemToRemove = uploadQueue.find((u) => u.id === idToRemove);
            if (itemToRemove?.status === "success" && itemToRemove.key) {
                  setUploadedAssets((prev) =>
                        prev.filter((a) => a.asset_key !== itemToRemove.key)
                  );
            }
      };

      // --- Form Submission ---
      const handleSubmit = async (e: React.FormEvent) => {
            if (
                  isProcessingQueue ||
                  uploadQueue.some(
                        (u) =>
                              u.status === "pending" || u.status === "uploading"
                  )
            ) {
                  toast.error(
                        "Please wait for all uploads to complete or remove failed items."
                  );
                  return;
            }
            e.preventDefault();
            if (isUploading) {
                  // Can keep this or rely on the check above
                  toast.error("Please wait for uploads to complete.");
                  return;
            }
            setIsSubmitting(true);
            let currentToastId: string | undefined;

            try {
                  currentToastId = toast.loading(
                        isEditMode ? "Updating memory..." : "Adding memory..."
                  );
                  // Validation based on type
                  if (memoryType === "quote" && !content.trim())
                        throw new Error("Content is required for Quote.");
                  if (memoryType === "hybrid" && !content.trim())
                        throw new Error("Content is required for Hybrid.");
                  if (
                        (memoryType === "image" || memoryType === "video") &&
                        uploadedAssets.length !== 1
                  )
                        throw new Error(`An ${memoryType} file is required.`);
                  if (memoryType === "gallery" && uploadedAssets.length === 0)
                        throw new Error(
                              "At least one image or video is required for Gallery."
                        );

                  // Prepare payload
                  const tagsString = tags.map((t) => t.value).join(",");
                  let payload: AddMemoryPayload | UpdateMemoryPayload;
                  if (isEditMode && existingMemory) {
                        // --- EDIT MODE ---
                        // Note: Backend currently only supports metadata updates via PATCH.
                        // We send only the allowed fields.
                        const currentAssetsWithOrder: AssetPayload[] =
                              uploadedAssets.map((asset, index) => ({
                                    ...asset,
                                    sort_order: index,
                              }));

                        payload = {
                              type: memoryType, // Send current type (backend validates change possibility)
                              content:
                                    memoryType === "quote" ||
                                    memoryType === "hybrid"
                                          ? content
                                          : undefined,
                              // *** INCLUDE THE CURRENT ASSETS STATE ***
                              assets:
                                    memoryType === "image" ||
                                    memoryType === "video" ||
                                    memoryType === "gallery"
                                          ? currentAssetsWithOrder
                                          : undefined,
                              caption: caption || undefined,
                              location: location || undefined,
                              memory_date: new Date(memoryDate).toISOString(),
                              tags: tagsString || undefined,
                        };
                        // Clean payload: remove fields with undefined values so PATCH only updates provided fields
                        // Keep 'assets' even if undefined/null if it was intended to clear them (backend handles this)
                        const cleanedPayload: UpdateMemoryPayload = {};
                        for (const key in payload) {
                              if (
                                    Object.prototype.hasOwnProperty.call(
                                          payload,
                                          key
                                    )
                              ) {
                                    const typedKey =
                                          key as keyof AddMemoryPayload;
                                    if (payload[typedKey] !== undefined) {
                                          (cleanedPayload as any)[typedKey] =
                                                payload[typedKey];
                                    }
                                    // Special case: If assets field is explicitly null/empty array in original payload, keep it to signify clearing assets
                                    else if (
                                          typedKey === "assets" &&
                                          payload.assets === undefined &&
                                          uploadedAssets.length === 0 &&
                                          [
                                                "image",
                                                "video",
                                                "gallery",
                                          ].includes(memoryType)
                                    ) {
                                          // If switching to a non-asset type, assets field will be undefined, which is correct
                                          // If staying as asset type but clearing, send assets: []
                                          if (
                                                memoryType === "gallery" ||
                                                memoryType === "image" ||
                                                memoryType === "video"
                                          ) {
                                                cleanedPayload.assets = []; // Explicitly send empty array to clear
                                          }
                                    }
                              }
                        }

                        console.log(
                              "PATCH Payload to API:",
                              JSON.stringify(cleanedPayload, null, 2)
                        ); // Debug Log

                        const updatedMemory = await updateMemory(
                              existingMemory.id,
                              cleanedPayload
                        );
                        // Send the payload including assets
                        toast.success("Memory updated!", {
                              id: currentToastId,
                        });
                        onMemorySaved(updatedMemory); // Pass the result from the API call
                  } else {
                        // --- ADD MODE ---
                        // Assign sort order to assets before sending
                        const assetsWithOrder = uploadedAssets.map(
                              (asset, index) => ({
                                    ...asset,
                                    sort_order: index,
                              })
                        );

                        payload = {
                              type: memoryType,
                              content:
                                    memoryType === "quote" ||
                                    memoryType === "hybrid"
                                          ? content
                                          : undefined,
                              assets:
                                    memoryType === "image" ||
                                    memoryType === "video" ||
                                    memoryType === "gallery"
                                          ? assetsWithOrder
                                          : undefined,
                              caption: caption || undefined,
                              location: location || undefined,
                              memory_date: new Date(memoryDate).toISOString(),
                              tags: tagsString || undefined,
                        };

                        const savedMemory = await addMemory(
                              payload as AddMemoryPayload
                        );
                        onMemorySaved(savedMemory); // Add to state in parent
                        toast.success("Memory added!", { id: currentToastId });
                  }
            } catch (err: any) {
                  console.error("Error saving memory:", err);
                  // Error handling already updates the toast using its ID
                  if (!currentToastId) {
                        // If loading toast wasn't even created due to early error
                        toast.error(
                              err.message || "An unexpected error occurred."
                        );
                  }
                  // No need to call toast.error again if currentToastId exists,
                  // as handleApiError inside add/updateMemory already does it.
                  // However, if the error originates *before* the API call (e.g., validation),
                  // we might need to update the toast here. Let's ensure it's always updated.
                  if (currentToastId) {
                        toast.error(
                              err.message || "An unexpected error occurred.",
                              { id: currentToastId }
                        );
                  }
            } finally {
                  setIsSubmitting(false);
                  // DO NOT dismiss toast here, let success/error messages show
            }
      };

      // --- Tag Input Handlers (Unchanged) ---
      const handleTagChange = (newValue: readonly TagOption[]) => {
            setTags(newValue);
      };
      const handleTagInputChange = (inputValue: string) => {
            setTagInputValue(inputValue);
      };
      const handleTagKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (!tagInputValue) return;
            switch (event.key) {
                  case "Enter":
                  case "Tab":
                  case ",":
                        event.preventDefault();
                        const newTag = tagInputValue.trim();
                        if (
                              newTag &&
                              !tags.some(
                                    (tag) => tag.value === newTag.toLowerCase()
                              )
                        ) {
                              setTags([...tags, createOption(newTag)]);
                        }
                        setTagInputValue("");
                        break;
                  default:
                        break;
            }
      };

      // --- Render Logic ---
      const renderFileUploadArea = () => {
            const showUpload =
                  memoryType === "image" ||
                  memoryType === "video" ||
                  memoryType === "gallery";
            if (!showUpload) return null;

            const acceptType =
                  memoryType === "image"
                        ? "image/*"
                        : memoryType === "video"
                        ? "video/*"
                        : "image/*,video/*";
            const isMultiple = memoryType === "gallery";

            return (
                  <div className="mb-4">
                        <label
                              htmlFor="assetFile"
                              className="block text-sm font-medium text-gray-700 mb-1"
                        >
                              {memoryType === "image"
                                    ? "Image File"
                                    : memoryType === "video"
                                    ? "Video File"
                                    : "Gallery Files"}
                              {isEditMode &&
                                    uploadedAssets.length > 0 &&
                                    " (Select new to replace/add)"}
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                              <div className="space-y-1 text-center">
                                    <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600">
                                          <label
                                                htmlFor="assetFile"
                                                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                          >
                                                <span>
                                                      Upload{" "}
                                                      {isMultiple
                                                            ? "files"
                                                            : "a file"}
                                                </span>
                                                <input
                                                      id="assetFile"
                                                      name="assetFile"
                                                      type="file"
                                                      ref={fileInputRef}
                                                      accept={acceptType}
                                                      multiple={isMultiple}
                                                      onChange={
                                                            handleFileSelected
                                                      }
                                                      className="sr-only"
                                                      disabled={
                                                            isUploading ||
                                                            isSubmitting
                                                      }
                                                />
                                          </label>
                                          <p className="pl-1">
                                                or drag and drop
                                          </p>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                          {memoryType === "image"
                                                ? "PNG, JPG, GIF, WebP"
                                                : memoryType === "video"
                                                ? "MP4, WebM, MOV"
                                                : "Images and Videos"}
                                    </p>
                              </div>
                        </div>

                        {/* Display Upload Queue and Progress */}
                        {(uploadQueue.length > 0 ||
                              (isEditMode &&
                                    uploadedAssets.length > 0 &&
                                    (memoryType as MemoryType) !== "quote" &&
                                    (memoryType as MemoryType) !==
                                          "hybrid")) && (
                              <div className="mt-4 space-y-2">
                                    <h4 className="text-sm font-medium text-gray-600">
                                          {memoryType === "gallery"
                                                ? "Uploaded / Pending Files:"
                                                : "File:"}
                                    </h4>
                                    {/* Show existing assets in edit mode */}
                                    {isEditMode &&
                                          memoryType !== "gallery" &&
                                          uploadedAssets.length > 0 &&
                                          uploadQueue.length === 0 && (
                                                <div className="flex items-center justify-between p-2 border rounded-md bg-gray-50 text-sm">
                                                      <span className="truncate">
                                                            {uploadedAssets[0].asset_key
                                                                  .split("-")
                                                                  .slice(1)
                                                                  .join(
                                                                        "-"
                                                                  )}{" "}
                                                            (Current)
                                                      </span>
                                                      <span className="text-green-600 font-medium">
                                                            Uploaded
                                                      </span>
                                                </div>
                                          )}
                                    {uploadQueue.map((upload) => (
                                          <div
                                                key={upload.id}
                                                className="flex items-center justify-between p-2 border rounded-md bg-gray-50 text-sm"
                                          >
                                                <span className="truncate flex-1 mr-2">
                                                      {upload.file.name}
                                                </span>
                                                {upload.status ===
                                                      "pending" && (
                                                      <span className="text-gray-500">
                                                            Pending...
                                                      </span>
                                                )}
                                                {upload.status ===
                                                      "uploading" && (
                                                      <span className="text-indigo-600 animate-pulse">
                                                            Uploading...
                                                      </span>
                                                )}
                                                {upload.status ===
                                                      "success" && (
                                                      <span className="text-green-600 font-medium">
                                                            Success
                                                      </span>
                                                )}
                                                {upload.status === "error" && (
                                                      <span
                                                            className="text-red-600 font-medium truncate"
                                                            title={upload.error}
                                                      >
                                                            Error
                                                      </span>
                                                )}
                                                <button
                                                      type="button"
                                                      onClick={() =>
                                                            removeUploadItem(
                                                                  upload.id
                                                            )
                                                      }
                                                      className="ml-2 text-gray-400 hover:text-red-600"
                                                      title="Remove"
                                                      disabled={isSubmitting}
                                                >
                                                      <XCircleIcon className="w-5 h-5" />
                                                </button>
                                          </div>
                                    ))}
                                    {/* Show already uploaded gallery items - simpler display */}
                                    {memoryType === "gallery" &&
                                          uploadedAssets.length > 0 &&
                                          uploadedAssets.map(
                                                (asset, index) =>
                                                      // Only show if not represented in the current queue (to avoid duplicates)
                                                      !uploadQueue.some(
                                                            (q) =>
                                                                  q.key ===
                                                                  asset.asset_key
                                                      ) && (
                                                            <div
                                                                  key={`${asset.asset_key}-${index}`}
                                                                  className="flex items-center justify-between p-2 border rounded-md bg-green-50 text-sm"
                                                            >
                                                                  <div className="flex items-center truncate mr-2">
                                                                        {asset.asset_type ===
                                                                        "image" ? (
                                                                              <PhotoIcon className="w-4 h-4 mr-1 text-gray-500" />
                                                                        ) : (
                                                                              <VideoCameraIcon className="w-4 h-4 mr-1 text-gray-500" />
                                                                        )}
                                                                        <span className="truncate">
                                                                              {asset.asset_key
                                                                                    .split(
                                                                                          "-"
                                                                                    )
                                                                                    .slice(
                                                                                          1
                                                                                    )
                                                                                    .join(
                                                                                          "-"
                                                                                    )}
                                                                        </span>
                                                                  </div>
                                                                  <span className="text-green-600 font-medium">
                                                                        Uploaded
                                                                  </span>
                                                                  {/* Optional: Add remove button for existing assets in edit mode */}
                                                            </div>
                                                      )
                                          )}
                              </div>
                        )}
                  </div>
            );
      };

      return (
            <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Memory Type Selector */}
                  <div>
                        <label
                              htmlFor="memoryType"
                              className="block text-sm font-medium text-gray-700 mb-1"
                        >
                              Memory Type
                        </label>
                        <select
                              id="memoryType"
                              value={memoryType}
                              onChange={(e) => {
                                    const newType = e.target
                                          .value as MemoryType;
                                    setMemoryType(newType);
                                    // Reset assets if switching away from asset types
                                    if (
                                          ![
                                                "image",
                                                "video",
                                                "gallery",
                                          ].includes(newType)
                                    ) {
                                          setUploadQueue([]);
                                          setUploadedAssets([]);
                                    } else if (
                                          newType !== "gallery" &&
                                          uploadedAssets.length > 1
                                    ) {
                                          // If switching to single asset type, keep only first asset (if any)
                                          setUploadedAssets(
                                                uploadedAssets.slice(0, 1)
                                          );
                                    }
                              }}
                              required
                              disabled={isEditMode} // Disable type change in edit mode (backend limitation)
                              className={`w-full p-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 ${
                                    isEditMode
                                          ? "bg-gray-100 cursor-not-allowed"
                                          : "border-gray-300"
                              }`}
                        >
                              <option value="quote">Quote</option>
                              <option value="image">Image</option>
                              <option value="video">Video</option>
                              <option value="hybrid">Hybrid (Blog Post)</option>
                              <option value="gallery">Gallery</option>
                        </select>
                        {isEditMode && (
                              <p className="text-xs text-gray-500 mt-1">
                                    Type cannot be changed after creation.
                              </p>
                        )}
                  </div>

                  {/* Conditional Fields */}
                  {memoryType === "quote" /* ... Quote textarea ... */ && (
                        <div>
                              <label
                                    htmlFor="quoteContent"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                    Quote
                              </label>
                              <textarea
                                    id="quoteContent"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    required
                                    rows={3}
                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              ></textarea>
                        </div>
                  )}
                  {memoryType === "hybrid" /* ... HybridEditor ... */ && (
                        <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Blog Content
                              </label>
                              <HybridEditor
                                    value={content}
                                    onChange={setContent}
                              />
                        </div>
                  )}

                  {/* File Upload Area */}
                  {renderFileUploadArea()}

                  {/* Caption (Common for image, video, gallery, hybrid?) */}
                  {(memoryType === "image" ||
                        memoryType === "video" ||
                        memoryType === "gallery" ||
                        memoryType === "hybrid") && (
                        <div>
                              <label
                                    htmlFor="caption"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                    {memoryType === "gallery"
                                          ? "Gallery Description"
                                          : "Caption"}{" "}
                                    (optional)
                              </label>
                              <input
                                    type="text"
                                    id="caption"
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              />
                        </div>
                  )}

                  {/* Common Fields: Date, Location, Tags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                              <label
                                    htmlFor="memoryDate"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                    Date & Time
                              </label>
                              <input
                                    type="datetime-local"
                                    id="memoryDate"
                                    value={memoryDate}
                                    onChange={(e) =>
                                          setMemoryDate(e.target.value)
                                    }
                                    required
                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              />
                        </div>
                        <div>
                              <label
                                    htmlFor="location"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                              >
                                    Location (optional)
                              </label>
                              <input
                                    type="text"
                                    id="location"
                                    value={location}
                                    onChange={(e) =>
                                          setLocation(e.target.value)
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                              />
                        </div>
                  </div>

                  {/* Tags Input (Unchanged structure) */}
                  <div>
                        <label
                              htmlFor="tags"
                              className="block text-sm font-medium text-gray-700 mb-1"
                        >
                              Tags (optional)
                        </label>
                        <Select /* ... props ... */
                              isMulti
                              isClearable
                              components={{ DropdownIndicator: null }}
                              inputValue={tagInputValue}
                              value={tags}
                              onChange={handleTagChange}
                              onInputChange={handleTagInputChange}
                              onKeyDown={handleTagKeyDown}
                              placeholder="Type a tag and press Enter..."
                              className="basic-multi-select"
                              classNamePrefix="tag-select"
                        />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                              type="button"
                              onClick={onCancel}
                              disabled={isSubmitting || isUploading}
                              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                              Cancel
                        </button>
                        <button
                              type="submit"
                              disabled={isUploading || isSubmitting}
                              className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                              {isSubmitting
                                    ? "Saving..."
                                    : isUploading
                                    ? "Uploading..."
                                    : isEditMode
                                    ? "Update Memory"
                                    : "Add Memory"}
                        </button>
                  </div>
            </form>
      );
};

export default AddMemoryForm;
