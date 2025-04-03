// src/components/MemoryDetailModal.tsx
import React from "react";
import { Memory, MemoryAsset, getAssetPath } from "../services/api";
import { format, formatDistanceToNow } from "date-fns";
import HybridEditor from "./HybridEditor";
import { PencilIcon } from "./Icons";
import Modal from "./Modal"; // Import the generic Modal
import { Carousel } from "react-responsive-carousel"; // Import Carousel
import "react-responsive-carousel/lib/styles/carousel.min.css"; // Import carousel styles
import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";

interface MemoryDetailModalProps {
      memory: Memory;
      onClose: () => void;
      onEditRequest: (memory: Memory) => void;
}

const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
      memory,
      onClose,
      onEditRequest,
}) => {
      const formattedDate = format(new Date(memory.memory_date), "PPPP p"); // Full date and time
      const tagsArray = memory.tags
            ? memory.tags.split(",").filter(Boolean)
            : [];

      // Helper to get the primary asset
      const primaryAsset: MemoryAsset | undefined = memory.assets?.[0];
      // Use original asset key for full view
      const fullAssetSrc = getAssetPath(primaryAsset?.asset_key);

      const renderFullContent = () => {
            switch (memory.type) {
                  case "quote":
                        return (
                              <div className="flex items-start space-x-4 my-4">
                                    <ChatBubbleLeftEllipsisIcon className="w-8 h-8 text-indigo-500 mt-1 flex-shrink-0" />
                                    <blockquote className="text-xl lg:text-2xl italic text-gray-800 py-2">
                                          "{memory.content}"
                                    </blockquote>
                              </div>
                        );
                  case "image":
                        return fullAssetSrc ? (
                              <div className="my-4 text-center">
                                    <img
                                          src={fullAssetSrc}
                                          alt={memory.caption || "Memory image"}
                                          className="max-w-full max-h-[75vh] object-contain rounded-lg inline-block shadow-md bg-gray-100"
                                          loading="lazy"
                                    />
                              </div>
                        ) : (
                              <p className="text-gray-500 italic text-center my-6">
                                    Image not available.
                              </p>
                        );

                  case "video":
                        return fullAssetSrc ? (
                              <div className="my-4">
                                    <video
                                          src={fullAssetSrc}
                                          className="max-w-full max-h-[75vh] rounded-lg mx-auto block shadow-md bg-black"
                                          controls
                                          autoPlay={false}
                                          preload="metadata"
                                    />
                              </div>
                        ) : (
                              <p className="text-gray-500 italic text-center my-6">
                                    Video not available.
                              </p>
                        );

                  case "gallery":
                        if (!memory.assets || memory.assets.length === 0) {
                              return (
                                    <p className="text-gray-500 italic text-center my-6">
                                          Gallery is empty.
                                    </p>
                              );
                        }
                        return (
                              <div className="my-4 -mx-6 md:mx-0">
                                    {" "}
                                    {/* Negative margin to stretch carousel on mobile */}
                                    <Carousel
                                          showArrows={true}
                                          showThumbs={memory.assets.length > 1} // Show thumbs only if multiple items
                                          showStatus={false}
                                          infiniteLoop={true}
                                          useKeyboardArrows={true}
                                          emulateTouch={true}
                                          className="memory-gallery-carousel" // Add custom class for potential styling
                                          dynamicHeight={false} // Keep height consistent if possible
                                    >
                                          {memory.assets.map((asset) => (
                                                <div
                                                      key={asset.id}
                                                      className="h-[60vh] md:h-[70vh] bg-black flex items-center justify-center"
                                                >
                                                      {" "}
                                                      {/* Fixed height container */}
                                                      {asset.asset_type ===
                                                            "image" && (
                                                            <img
                                                                  src={
                                                                        getAssetPath(
                                                                              asset.asset_key
                                                                        )!
                                                                  }
                                                                  alt={`Gallery image ${
                                                                        asset.sort_order +
                                                                        1
                                                                  }`}
                                                                  className="object-contain h-full w-auto block" // Ensure image fits within height
                                                            />
                                                      )}
                                                      {asset.asset_type ===
                                                            "video" && (
                                                            <video
                                                                  src={
                                                                        getAssetPath(
                                                                              asset.asset_key
                                                                        )!
                                                                  }
                                                                  controls
                                                                  preload="metadata"
                                                                  className="object-contain h-full w-auto block" // Ensure video fits within height
                                                            />
                                                      )}
                                                </div>
                                          ))}
                                    </Carousel>
                              </div>
                        );

                  case "hybrid":
                        return (
                              <div className="prose prose-indigo lg:prose-lg max-w-none my-4">
                                    {" "}
                                    {/* Use Tailwind Typography */}
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

      // Define title based on memory type
      let modalTitle = "Memory Details";
      switch (memory.type) {
            case "quote":
                  modalTitle = "Quote Memory";
                  break;
            case "image":
                  modalTitle = "Image Memory";
                  break;
            case "video":
                  modalTitle = "Video Memory";
                  break;
            case "gallery":
                  modalTitle = "Gallery Memory";
                  break;
            case "hybrid":
                  modalTitle = "Blog Post Memory";
                  break;
      }

      // Use the generic Modal component
      return (
            <Modal
                  isOpen={true} // Controlled by parent rendering
                  onClose={onClose}
                  title={modalTitle}
                  maxWidth="max-w-4xl" // Allow larger modal for details/gallery
                  useBlur={true} // Use blur effect
            >
                  {/* Content inside the generic modal */}
                  <div className="relative">
                        {" "}
                        {/* Container for absolute positioned edit button */}
                        {/* Edit Button */}
                        <button
                              onClick={() => onEditRequest(memory)}
                              className="absolute -top-11 right-10 p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 z-20" // Adjust position relative to modal title/padding
                              aria-label="Edit Memory"
                        >
                              <PencilIcon className="w-5 h-5" />
                        </button>
                        {/* Metadata Section */}
                        <div className="text-sm text-gray-600 mb-4 border-b pb-3 space-y-1">
                              <p>
                                    <strong className="font-medium text-gray-800 w-20 inline-block">
                                          Date:
                                    </strong>{" "}
                                    {formattedDate}
                              </p>
                              {memory.location && (
                                    <p>
                                          <strong className="font-medium text-gray-800 w-20 inline-block">
                                                Location:
                                          </strong>{" "}
                                          {memory.location}
                                    </p>
                              )}
                              <p>
                                    <strong className="font-medium text-gray-800 w-20 inline-block">
                                          Author:
                                    </strong>{" "}
                                    {memory.user_id}
                              </p>
                              {memory.edited_by && memory.updated_at && (
                                    <p>
                                          <strong className="font-medium text-gray-800 w-20 inline-block">
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
                                    <div className="flex items-start pt-1">
                                          <strong className="font-medium text-gray-800 w-20 inline-block flex-shrink-0">
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
                        {/* Main Content Area */}
                        <div className="mt-4">
                              {renderFullContent()}
                              {/* Display caption below content */}
                              {memory.caption && memory.type !== "quote" && (
                                    <p className="text-center text-gray-700 italic mt-4 text-base">
                                          {memory.caption}
                                    </p>
                              )}
                        </div>
                  </div>
            </Modal>
      );
};

export default MemoryDetailModal;
