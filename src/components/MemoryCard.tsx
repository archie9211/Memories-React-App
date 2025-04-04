// src/components/MemoryCard.tsx
import React from "react";
import { Memory, MemoryAsset, getAssetPath } from "../services/api";
import { format } from "date-fns";
import { PencilIcon } from "./Icons"; // Reverted to local Icon component
import {
      PhotoIcon,
      VideoCameraIcon,
      DocumentTextIcon,
      ChatBubbleLeftEllipsisIcon,
      RectangleStackIcon,
} from "@heroicons/react/24/outline"; // Using Heroicons

interface MemoryCardProps {
      memory: Memory;
      onCardClick: (memory: Memory) => void;
      onEditClick: (memory: Memory) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({
      memory,
      onCardClick,
      onEditClick,
}) => {
      // Helper to get the primary asset (first one for gallery/image/video)
      const primaryAsset: MemoryAsset | undefined = memory.assets?.[0];

      // Use thumbnail if available (for images), otherwise fallback to original key
      const previewSrc = primaryAsset
            ? getAssetPath(
                    primaryAsset.asset_type === "image"
                          ? primaryAsset.thumbnail_key || primaryAsset.asset_key
                          : primaryAsset.asset_key
              )
            : null;

      const renderContentPreview = () => {
            switch (memory.type) {
                  case "quote":
                        return (
                              <div className="flex items-start space-x-3 my-2">
                                    <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-indigo-400 mt-1 flex-shrink-0" />
                                    <p className="italic text-gray-700 border-l-4 border-indigo-200 pl-3 py-1 text-base line-clamp-4">
                                          "{memory.content}"
                                    </p>
                              </div>
                        );
                  case "image":
                        return previewSrc ? (
                              <div className="aspect-w-16 aspect-h-9 my-2 rounded overflow-hidden bg-cyan relative">
                                    {" "}
                                    {/* Added aspect ratio */}
                                    <img
                                          src={previewSrc}
                                          alt={memory.caption || "Memory image"}
                                          loading="lazy"
                                          decoding="async"
                                          className="w-full h-full object-cover"
                                    />
                                    <PhotoIcon
                                          className="absolute top-2 left-2 w-5 h-5 text-white opacity-70 bg-cyan rounded-sm p-0.5"
                                          title="Image"
                                    />
                              </div>
                        ) : (
                              <p className="text-gray-400 italic text-center my-4">
                                    No image preview
                              </p>
                        );
                  case "video":
                        return previewSrc ? (
                              // Show placeholder/thumbnail for video, don't autoplay/load full video in card
                              <div className="aspect-w-16 aspect-h-9 my-2 rounded overflow-hidden bg-cyan-50 relative">
                                    <VideoCameraIcon
                                          className="absolute top-2 left-2 w-5 h-5 text-white opacity-70 bg-cyan-50 rounded-sm p-0.5"
                                          title="Video"
                                    />
                                    {/* You could potentially show a poster image if available */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                          <VideoCameraIcon className="w-16 h-16 text-gray-300 opacity-50" />
                                    </div>
                                    {/* Or use thumbnail if video has one generated */}
                                    {primaryAsset?.thumbnail_key && (
                                          <img
                                                src={
                                                      getAssetPath(
                                                            primaryAsset.thumbnail_key
                                                      ) || undefined
                                                }
                                                alt="Video preview"
                                                className="w-full h-full object-cover opacity-80"
                                          />
                                    )}
                              </div>
                        ) : (
                              <p className="text-gray-400 italic text-center my-4">
                                    No video preview
                              </p>
                        );

                  case "gallery":
                        return (
                              <div className="aspect-w-16 aspect-h-9 my-2 rounded overflow-hidden bg-gray-200 relative group">
                                    {" "}
                                    {/* Added group */}
                                    {previewSrc ? (
                                          <img
                                                src={previewSrc}
                                                alt="Gallery preview"
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover"
                                          />
                                    ) : (
                                          <RectangleStackIcon className="w-16 h-16 text-gray-400 absolute inset-0 m-auto" />
                                    )}
                                    {/* Overlay to indicate gallery - Always visible now */}
                                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                          <span className="text-white text-sm font-semibold bg-black bg-opacity-60 px-2 py-1 rounded">
                                                Gallery (
                                                {memory.assets?.length || 0})
                                          </span>
                                    </div>
                                    {/* Icon in corner is still useful */}
                                    <RectangleStackIcon
                                          className="absolute top-2 left-2 w-5 h-5 text-white opacity-70 bg-black/30 rounded-sm p-0.5"
                                          title="Gallery"
                                    />
                              </div>
                        );

                  case "hybrid":
                        // Extract plain text snippet
                        const snippet = memory.content
                              ? memory.content.length > 200
                                    ? memory.content.substring(0, 197) + "..."
                                    : memory.content
                              : "";
                        const plainTextSnippet = snippet
                              .replace(/<[^>]*>?/gm, " ")
                              .replace(/\s+/g, " ")
                              .trim(); // Clean HTML and extra spaces
                        return (
                              <div className="flex items-start space-x-3 my-2">
                                    <DocumentTextIcon className="w-6 h-6 text-indigo-400 mt-1 flex-shrink-0" />
                                    <p className="text-gray-600 text-sm line-clamp-3">
                                          {plainTextSnippet || "Blog Post"}
                                    </p>
                              </div>
                        );
                  default:
                        return null;
            }
      };

      const formattedDate = format(new Date(memory.memory_date), "MMM d, yyyy"); // Shorter format
      const tagsArray = memory.tags
            ? memory.tags.split(",").filter(Boolean)
            : [];

      const handleEdit = (e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent card click when clicking edit
            onEditClick(memory);
      };

      return (
            <div
                  className="bg-cyan rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 relative group cursor-pointer flex flex-col h-full" // Added flex, h-full
                  onClick={() => onCardClick(memory)}
            >
                  {/* Edit Button - More prominent */}
                  <button
                        onClick={handleEdit}
                        className="absolute top-2 right-2 p-1.5 bg-gray-100 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-indigo-100 hover:text-indigo-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 z-10 transition-opacity duration-200"
                        aria-label="Edit Memory"
                  >
                        <PencilIcon className="w-4 h-4" />
                  </button>
                  {/* Card Body */}
                  <div className="p-4 flex-grow">
                        {" "}
                        {/* Added flex-grow */}
                        {/* Header: Date & Location */}
                        <div className="flex justify-between items-center mb-2 text-xs text-gray-500">
                              <span className="font-medium">
                                    {formattedDate}
                              </span>
                              {memory.location && (
                                    <span
                                          className="italic truncate"
                                          title={memory.location}
                                    >
                                          📍 {memory.location}
                                    </span>
                              )}
                        </div>
                        {/* Content Preview Area */}
                        <div className="mb-2">{renderContentPreview()}</div>
                        {/* Caption (if applicable and exists) */}
                        {memory.caption &&
                              (memory.type === "image" ||
                                    memory.type === "video" ||
                                    memory.type === "gallery") && (
                                    <p className="text-sm text-gray-600 mt-1 italic line-clamp-2">
                                          {memory.caption}
                                    </p>
                              )}
                  </div>
                  {/* Footer Area */}
                  <div className="p-4 pt-2 border-t border-gray-100">
                        {/* Tags */}
                        {tagsArray.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                    {tagsArray.map((tag) => (
                                          <span
                                                key={tag}
                                                className="bg-indigo-50 text-indigo-600 text-xs font-medium px-1.5 py-0.5 rounded"
                                          >
                                                #{tag}
                                          </span>
                                    ))}
                              </div>
                        )}

                        {/* Author/Editor Info - Simplified */}
                        <div className="text-xs text-gray-400 mt-1 flex justify-between items-center">
                              <span
                                    className="truncate"
                                    title={`Author: ${memory.user_id}`}
                              >
                                    By: {memory.user_id.split("@")[0]}
                              </span>
                              {memory.edited_by && (
                                    <span
                                          className="truncate text-right"
                                          title={`Edited by ${
                                                memory.edited_by
                                          } on ${new Date(
                                                memory.updated_at!
                                          ).toLocaleString()}`}
                                    >
                                          Edited
                                    </span>
                              )}
                        </div>
                  </div>{" "}
                  {/* End Footer Area */}
            </div>
      );
};

export default MemoryCard;
