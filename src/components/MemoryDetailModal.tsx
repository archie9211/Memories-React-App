import React from "react"; // Removed useEffect from imports
import { Memory, getAssetPath } from "../services/api";
import { format, formatDistanceToNow } from "date-fns";
import HybridEditor from "./HybridEditor";
import { PencilIcon } from "./Icons"; // Make sure you have this icon component
import { useScrollLock } from "../hooks/useScrollLock";

interface MemoryDetailModalProps {
      memory: Memory; // Changed: No longer accepts null, parent handles conditional rendering
      onClose: () => void;
      onEditRequest: (memory: Memory) => void;
}

const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
      memory,
      onClose,
      onEditRequest,
}) => {
      // Replace the existing useEffect with this hook
      useScrollLock();

      const formattedDate = format(new Date(memory.memory_date), "PPPP p");
      const tagsArray = memory.tags
            ? memory.tags.split(",").filter(Boolean)
            : [];

      const renderFullContent = () => {
            const assetSrc = getAssetPath(memory.asset_key); // Get direct path

            switch (memory.type) {
                  case "quote":
                        return (
                              <blockquote className="text-xl italic border-l-4 border-gray-300 pl-4 py-2 my-4 text-gray-700">
                                    {memory.content}
                              </blockquote>
                        );
                  case "image":
                        return assetSrc ? (
                              <img
                                    src={assetSrc}
                                    alt={memory.caption || "Memory image"}
                                    className="max-w-full max-h-[70vh] object-contain rounded my-4 mx-auto block bg-cyan"
                                    loading="lazy"
                              />
                        ) : (
                              <p className="text-gray-400 italic text-center my-4">
                                    Image not available.
                              </p>
                        );
                  case "video":
                        return assetSrc ? (
                              <video
                                    src={assetSrc}
                                    className="max-w-full max-h-[70vh] rounded my-4 mx-auto block bg-cyan"
                                    controls
                                    autoPlay={false}
                                    preload="metadata"
                              />
                        ) : (
                              <p className="text-gray-400 italic text-center my-4">
                                    Video not available.
                              </p>
                        );
                  case "hybrid":
                        // Ensure @tailwindcss/typography plugin is installed and configured for 'prose'
                        return (
                              <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none mt-4">
                                    <HybridEditor
                                          value={memory.content || ""}
                                          onChange={() => {}}
                                          readOnly={true}
                                    />
                              </div>
                        );
                  default:
                        return null;
            }
      };

      // This component IS the modal, including the backdrop
      return (
            // Modal Backdrop - with BLUR effect
            <div
                  className="fixed inset-0 bg-gray-500 bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50 p-4" // <-- Ensure these classes are present
                  onClick={onClose} // Close on backdrop click
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="memory-detail-title"
            >
                  {/* Modal Content Container */}
                  <div
                        className="bg-cyan rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 relative"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                  >
                        {/* Close ('X') Button */}
                        <button
                              onClick={onClose}
                              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl leading-none font-semibold outline-none focus:outline-none z-10"
                              aria-label="Close modal"
                        >
                              ×
                        </button>
                        {/* Edit (Pencil) Button */}
                        <button
                              onClick={() => onEditRequest(memory)} // Trigger edit modal opening
                              className="absolute top-3 right-10 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 z-10"
                              aria-label="Edit Memory"
                        >
                              <PencilIcon className="w-5 h-5" />
                        </button>
                        {/* Header Text */}
                        <h2
                              id="memory-detail-title"
                              className="text-2xl font-semibold mb-4 capitalize pr-16"
                        >
                              {memory.type} Memory
                        </h2>{" "}
                        {/* Padding-right to avoid overlap */}
                        {/* Metadata Section */}
                        <div className="text-sm text-gray-600 mb-4 border-b pb-3">
                              <p>
                                    <strong className="font-medium text-gray-800">
                                          Date:
                                    </strong>{" "}
                                    {formattedDate}
                              </p>
                              {memory.location && (
                                    <p>
                                          <strong className="font-medium text-gray-800">
                                                Location:
                                          </strong>{" "}
                                          {memory.location}
                                    </p>
                              )}
                              <p>
                                    <strong className="font-medium text-gray-800">
                                          Author:
                                    </strong>{" "}
                                    {memory.user_id}
                              </p>
                              {memory.edited_by && memory.updated_at && (
                                    <p>
                                          <strong className="font-medium text-gray-800">
                                                Edited:
                                          </strong>{" "}
                                          {memory.edited_by} (
                                          {formatDistanceToNow(
                                                new Date(memory.updated_at),
                                                { addSuffix: true }
                                          )}
                                          )
                                    </p>
                              )}
                              {tagsArray.length > 0 && (
                                    <div className="mt-2">
                                          <strong className="font-medium text-gray-800 block mb-1">
                                                Tags:
                                          </strong>
                                          <div className="flex flex-wrap gap-1">
                                                {tagsArray.map((tag) => (
                                                      <span
                                                            key={tag}
                                                            className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded"
                                                      >
                                                            {tag}
                                                      </span>
                                                ))}
                                          </div>
                                    </div>
                              )}
                        </div>
                        {/* Main Content Area (Image, Video, Quote, Hybrid) */}
                        <div className="mt-4">
                              {renderFullContent()}
                              {memory.caption &&
                                    (memory.type === "image" ||
                                          memory.type === "video") && (
                                          <p className="text-center text-gray-700 italic mt-3">
                                                {memory.caption}
                                          </p>
                                    )}
                        </div>
                  </div>{" "}
                  {/* End Modal Content Container */}
            </div>
      );
};

export default MemoryDetailModal;
