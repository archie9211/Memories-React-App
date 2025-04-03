import React from "react";
import { Memory, getAssetPath } from "../services/api";
import { format, formatDistanceToNow } from "date-fns";
import { PencilIcon } from "./Icons";

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
      const renderContentPreview = () => {
            const assetSrc = getAssetPath(memory.asset_key);
            switch (memory.type) {
                  case "quote":
                        return (
                              <p className="italic text-lg text-gray-700 border-l-4 border-gray-300 pl-4 py-2 my-2">
                                    "{memory.content}"
                              </p>
                        );
                  case "image":
                        return assetSrc ? (
                              <img
                                    src={assetSrc}
                                    alt={memory.caption || "Memory image"}
                                    loading="lazy"
                                    decoding="async"
                                    width={400}
                                    height={300}
                                    className="w-full max-h-[400px] object-contain rounded my-2 bg-cyan-50"
                              />
                        ) : (
                              <p className="text-gray-400 italic text-center my-4">
                                    No image preview
                              </p>
                        );
                  case "video":
                        return assetSrc ? (
                              <video
                                    src={assetSrc}
                                    className="w-full max-h-[400px] object-contain rounded my-2 bg-cyan"
                                    controls
                                    muted
                                    loop
                                    playsInline
                                    preload="metadata"
                              />
                        ) : (
                              <p className="text-gray-400 italic text-center my-4">
                                    No video preview
                              </p>
                        );
                  case "hybrid":
                        const snippet = memory.content
                              ? memory.content.length > 150
                                    ? memory.content.substring(0, 147) + "..."
                                    : memory.content
                              : "";
                        const plainTextSnippet = snippet.replace(
                              /<[^>]*>?/gm,
                              ""
                        );
                        return (
                              <p className="text-gray-600 my-2 line-clamp-3">
                                    {plainTextSnippet || "Blog Post"}
                              </p>
                        );
                  default:
                        return null;
            }
      };

      const formattedDate = format(new Date(memory.memory_date), "PPP");
      const tagsArray = memory.tags
            ? memory.tags.split(",").filter(Boolean)
            : [];

      const handleEdit = (e: React.MouseEvent) => {
            e.stopPropagation();
            onEditClick(memory);
      };

      return (
            <div
                  className="bg-cyan-50 rounded-lg shadow-md p-4 mb-6 cursor-pointer hover:shadow-lg transition-shadow duration-200 relative group"
                  onClick={() => onCardClick(memory)}
            >
                  {/* Edit Button */}
                  <button
                        onClick={handleEdit}
                        className="absolute top-2 right-2 p-1 bg-gray-200 rounded-full text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 z-10"
                        aria-label="Edit Memory"
                  >
                        <PencilIcon className="w-5 h-5" />
                  </button>

                  {/* Header */}
                  <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                        <span className="font-semibold">{formattedDate}</span>
                        {memory.location && (
                              <span className="italic truncate">
                                    📍 {memory.location}
                              </span>
                        )}
                  </div>

                  {/* Body */}
                  <div className="mb-2">
                        {renderContentPreview()}
                        {memory.caption &&
                              (memory.type === "image" ||
                                    memory.type === "video") && (
                                    <p className="text-sm text-gray-600 mt-1 text-center italic">
                                          {memory.caption}
                                    </p>
                              )}
                  </div>

                  {/* Tags */}
                  {tagsArray.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                              {tagsArray.map((tag) => (
                                    <span
                                          key={tag}
                                          className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded"
                                    >
                                          {tag}
                                    </span>
                              ))}
                        </div>
                  )}

                  {/* Footer with Author/Editor Info */}
                  <div className="text-xs text-gray-400 border-t border-gray-200 pt-2 mt-2 flex justify-between">
                        <span>By: {memory.user_id}</span>
                        {memory.edited_by && memory.updated_at && (
                              <span
                                    title={new Date(
                                          memory.updated_at
                                    ).toLocaleString()}
                              >
                                    Edited by {memory.edited_by} (
                                    {formatDistanceToNow(
                                          new Date(memory.updated_at),
                                          {
                                                addSuffix: true,
                                          }
                                    )}
                                    )
                              </span>
                        )}
                  </div>
            </div>
      );
};

export default MemoryCard;
