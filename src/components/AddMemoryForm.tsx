import React, { useState, useRef, useEffect } from "react";
import Select from "react-select/creatable";
import {
      AddMemoryPayload,
      Memory,
      UpdateMemoryPayload,
      addMemory,
      updateMemory,
      uploadAsset,
} from "../services/api";
import HybridEditor from "./HybridEditor";
import toast from "react-hot-toast";

interface AddMemoryFormProps {
      onMemorySaved: (savedMemory: Memory) => void; // Callback after add/update
      existingMemory?: Memory | null; // Pass memory data if editing
      onCancel: () => void; // Callback for cancel action (closes modal)
}

type MemoryType = "quote" | "image" | "video" | "hybrid";

// Options for react-select tags
interface TagOption {
      readonly label: string;
      readonly value: string;
}
const createOption = (label: string) => ({
      label,
      value: label.toLowerCase().trim(),
});

const AddMemoryForm: React.FC<AddMemoryFormProps> = ({
      onMemorySaved,
      existingMemory = null,
      onCancel,
}) => {
      // State initialization based on existingMemory or defaults
      const [memoryType, setMemoryType] = useState<MemoryType>(
            existingMemory?.type || "quote"
      );
      const [content, setContent] = useState(existingMemory?.content || "");
      const [caption, setCaption] = useState(existingMemory?.caption || "");
      const [location, setLocation] = useState(existingMemory?.location || "");
      const initialDate = existingMemory?.memory_date
            ? new Date(existingMemory.memory_date).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16);
      const [memoryDate, setMemoryDate] = useState(initialDate);
      const [file, setFile] = useState<File | null>(null);
      const [tags, setTags] = useState<readonly TagOption[]>(
            existingMemory?.tags
                  ? existingMemory.tags.split(",").map(createOption)
                  : []
      );
      const [tagInputValue, setTagInputValue] = useState("");

      const [isUploading, setIsUploading] = useState(false);
      const [isSubmitting, setIsSubmitting] = useState(false);
      const fileInputRef = useRef<HTMLInputElement>(null);
      const isEditMode = !!existingMemory;

      // Effect to update form state if existingMemory prop changes while modal is open
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
            setFile(null); // Reset file on edit change
            if (fileInputRef.current) fileInputRef.current.value = "";
            // Don't reset loading/submitting states here
      }, [existingMemory]);

      const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setIsSubmitting(true);
            let currentToastId: string | undefined;
            let asset_key: string | undefined =
                  existingMemory?.asset_key || undefined;

            try {
                  // 1. Handle file upload if necessary (using direct upload service)
                  if (
                        (memoryType === "image" || memoryType === "video") &&
                        file
                  ) {
                        currentToastId = toast.loading(
                              `Uploading ${memoryType}...`
                        );
                        setIsUploading(true);
                        const uploadResponse = await uploadAsset(file); // Upload directly
                        asset_key = uploadResponse.key; // Get the key from the response
                        toast.success(
                              `${
                                    memoryType.charAt(0).toUpperCase() +
                                    memoryType.slice(1)
                              } uploaded!`,
                              { id: currentToastId }
                        );
                        setIsUploading(false);
                  } else if (
                        (memoryType === "image" || memoryType === "video") &&
                        !asset_key &&
                        !isEditMode
                  ) {
                        // Require file if adding new image/video memory
                        throw new Error(
                              `Please select a file for the ${memoryType} memory.`
                        );
                  }
                  // If type changes away from image/video in edit mode, clear the asset key
                  if (
                        isEditMode &&
                        existingMemory?.asset_key &&
                        memoryType !== "image" &&
                        memoryType !== "video"
                  ) {
                        asset_key = undefined;
                  }

                  // 2. Basic content validation
                  if (
                        (memoryType === "quote" || memoryType === "hybrid") &&
                        !content.trim()
                  ) {
                        throw new Error(
                              "Content cannot be empty for quote or hybrid memory."
                        );
                  }

                  // 3. Prepare payload
                  const tagsString = tags.map((t) => t.value).join(",");
                  const payload: AddMemoryPayload | UpdateMemoryPayload = {
                        type: memoryType,
                        content:
                              memoryType === "quote" || memoryType === "hybrid"
                                    ? content
                                    : undefined,
                        asset_key:
                              memoryType === "image" || memoryType === "video"
                                    ? asset_key
                                    : undefined,
                        caption:
                              memoryType === "image" || memoryType === "video"
                                    ? caption
                                    : undefined,
                        location: location || undefined,
                        memory_date: new Date(memoryDate).toISOString(),
                        tags: tagsString || undefined,
                  };

                  // Clean payload for PATCH request
                  if (isEditMode) {
                        Object.keys(payload).forEach(
                              (key) =>
                                    (payload as Record<string, any>)[key] ===
                                          undefined &&
                                    delete (payload as Record<string, any>)[key]
                        );
                        // Ensure type/date are always included for simplicity or handle backend more robustly
                        payload.type = memoryType;
                        payload.memory_date = new Date(
                              memoryDate
                        ).toISOString();
                  }

                  // 4. Call API (Add or Update)
                  currentToastId = toast.loading(
                        isEditMode ? "Updating memory..." : "Adding memory..."
                  );
                  let savedMemory: Memory;
                  if (isEditMode && existingMemory?.id) {
                        savedMemory = await updateMemory(
                              existingMemory.id,
                              payload as UpdateMemoryPayload
                        );
                  } else {
                        savedMemory = await addMemory(
                              payload as AddMemoryPayload
                        );
                  }
                  onMemorySaved(savedMemory); // Trigger parent (which closes modal)
            } catch (err: any) {
                  console.error("Error saving memory:", err);
                  if (currentToastId) {
                        toast.error(
                              err.message || "An unexpected error occurred.",
                              { id: currentToastId }
                        );
                  } else {
                        toast.error(
                              err.message || "An unexpected error occurred."
                        );
                  }
                  setIsUploading(false); // Ensure loading state is reset on error
            } finally {
                  setIsSubmitting(false);
            }
      };

      // Handle Tag Input Changes
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

      // Form is rendered inside a Modal component
      return (
            <form onSubmit={handleSubmit} className="p-0">
                  {/* Memory Type Selector */}
                  <div className="mb-4">
                        <label
                              htmlFor="memoryType"
                              className="block text-sm font-medium text-gray-700 mb-1"
                        >
                              Memory Type
                        </label>
                        <select
                              id="memoryType"
                              value={memoryType}
                              onChange={(e) =>
                                    setMemoryType(e.target.value as MemoryType)
                              }
                              required
                              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                              <option value="quote">Quote</option>
                              <option value="image">Image</option>
                              <option value="video">Video</option>
                              <option value="hybrid">Hybrid (Blog Post)</option>
                        </select>
                  </div>

                  {/* Conditional Fields based on Type */}
                  {memoryType === "quote" && (
                        <div className="mb-4">
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

                  {(memoryType === "image" || memoryType === "video") && (
                        <>
                              <div className="mb-4">
                                    <label
                                          htmlFor="assetFile"
                                          className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                          {memoryType === "image"
                                                ? "Image"
                                                : "Video"}{" "}
                                          File
                                    </label>
                                    {isEditMode &&
                                          existingMemory?.asset_key &&
                                          !file && (
                                                <div className="text-sm text-gray-500 mb-1 italic">
                                                      Current asset:{" "}
                                                      {existingMemory.asset_key
                                                            .split("/")
                                                            .pop()}{" "}
                                                      (Select new file to
                                                      replace)
                                                </div>
                                          )}
                                    <input
                                          type="file"
                                          id="assetFile"
                                          ref={fileInputRef}
                                          accept={
                                                memoryType === "image"
                                                      ? "image/*"
                                                      : "video/*"
                                          }
                                          onChange={(e) =>
                                                setFile(
                                                      e.target.files
                                                            ? e.target.files[0]
                                                            : null
                                                )
                                          }
                                          required={
                                                !isEditMode ||
                                                !existingMemory?.asset_key
                                          } // Required if adding new, or editing without existing asset
                                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    />
                                    {isUploading && (
                                          <p className="text-sm text-indigo-600 mt-1">
                                                Uploading...
                                          </p>
                                    )}
                              </div>
                              <div className="mb-4">
                                    <label
                                          htmlFor="caption"
                                          className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                          Caption (optional)
                                    </label>
                                    <input
                                          type="text"
                                          id="caption"
                                          value={caption}
                                          onChange={(e) =>
                                                setCaption(e.target.value)
                                          }
                                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                              </div>
                        </>
                  )}

                  {memoryType === "hybrid" && (
                        <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Blog Content
                              </label>
                              <HybridEditor
                                    value={content}
                                    onChange={setContent}
                              />
                        </div>
                  )}

                  {/* Common Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                  {/* Tags Input */}
                  <div className="mb-4">
                        <label
                              htmlFor="tags"
                              className="block text-sm font-medium text-gray-700 mb-1"
                        >
                              Tags (optional, comma/enter separated)
                        </label>
                        <Select
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
                              classNamePrefix="tag-select" // Ensure styling is applied via index.css
                        />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                        {" "}
                        {/* Added border-t */}
                        <button
                              type="button"
                              onClick={onCancel} // Closes the modal via prop
                              disabled={isSubmitting}
                              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
                                    : isEditMode
                                    ? "Update Memory"
                                    : "Add Memory"}
                        </button>
                  </div>
            </form>
      );
};

export default AddMemoryForm;
