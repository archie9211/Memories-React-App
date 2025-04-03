// src/components/GlobalMediaGalleryModal.tsx
import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { fetchAllMedia, GlobalMediaItem, getAssetPath } from "../services/api";
import LoadingSpinner from "./LoadingSpinner";
import { PhotoIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";

interface GlobalMediaGalleryModalProps {
      onClose: () => void;
}

const GlobalMediaGalleryModal: React.FC<GlobalMediaGalleryModalProps> = ({
      onClose,
}) => {
      const [mediaItems, setMediaItems] = useState<GlobalMediaItem[]>([]);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);
      const [selectedMedia, setSelectedMedia] =
            useState<GlobalMediaItem | null>(null); // For viewing single item larger

      useEffect(() => {
            const loadMedia = async () => {
                  setIsLoading(true);
                  setError(null);
                  try {
                        const response = await fetchAllMedia(); // Add pagination later if needed
                        // Sort by date descending if not already done by API
                        response.media.sort(
                              (a, b) =>
                                    new Date(b.memory_date).getTime() -
                                    new Date(a.memory_date).getTime()
                        );
                        setMediaItems(response.media);
                  } catch (err: any) {
                        setError(err.message || "Failed to load media");
                  } finally {
                        setIsLoading(false);
                  }
            };
            loadMedia();
      }, []);

      const handleMediaClick = (item: GlobalMediaItem) => {
            setSelectedMedia(item);
      };
      const handleCloseViewer = () => {
            setSelectedMedia(null);
      };

      return (
            <Modal
                  isOpen={true}
                  onClose={onClose}
                  title="All Media"
                  maxWidth="max-w-6xl"
                  useBlur={true}
            >
                  {isLoading ? (
                        <LoadingSpinner size="large" />
                  ) : error ? (
                        <p className="text-center text-red-600 bg-red-100 p-4 rounded">
                              Error: {error}
                        </p>
                  ) : mediaItems.length === 0 ? (
                        <p className="text-center text-gray-500">
                              No media found.
                        </p>
                  ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                              {mediaItems.map((item) => {
                                    // Use thumbnail for preview grid
                                    const previewSrc = getAssetPath(
                                          item.asset_type === "image"
                                                ? item.thumbnail_key ||
                                                        item.asset_key
                                                : item.asset_key
                                    );
                                    // Use original for full view
                                    // const fullSrc = getAssetPath(
                                    //       item.asset_key
                                    // );

                                    return (
                                          <div
                                                key={item.asset_key}
                                                className="aspect-square bg-gray-100 rounded overflow-hidden cursor-pointer relative group hover:shadow-lg transition-shadow"
                                                onClick={() =>
                                                      handleMediaClick(item)
                                                }
                                                title={`Memory Date: ${format(
                                                      new Date(
                                                            item.memory_date
                                                      ),
                                                      "PPP"
                                                )}\nCaption: ${
                                                      item.memory_caption ||
                                                      "N/A"
                                                }`}
                                          >
                                                {item.asset_type === "image" &&
                                                      previewSrc && (
                                                            <img
                                                                  src={
                                                                        previewSrc
                                                                  }
                                                                  alt="Media thumbnail"
                                                                  loading="lazy"
                                                                  className="w-full h-full object-cover"
                                                            />
                                                      )}
                                                {item.asset_type ===
                                                      "video" && (
                                                      <>
                                                            {/* Show video thumbnail if available */}
                                                            {item.thumbnail_key &&
                                                            getAssetPath(
                                                                  item.thumbnail_key
                                                            ) ? (
                                                                  <img
                                                                        src={
                                                                              getAssetPath(
                                                                                    item.thumbnail_key
                                                                              )!
                                                                        }
                                                                        alt="Video thumbnail"
                                                                        loading="lazy"
                                                                        className="w-full h-full object-cover opacity-80"
                                                                  />
                                                            ) : (
                                                                  <div className="w-full h-full bg-black flex items-center justify-center">
                                                                        <VideoCameraIcon className="w-1/3 h-1/3 text-gray-400" />
                                                                  </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                  <VideoCameraIcon className="w-8 h-8 text-white" />
                                                            </div>
                                                      </>
                                                )}
                                                {!previewSrc &&
                                                      item.asset_type ===
                                                            "image" && ( // Placeholder if somehow image src is missing
                                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                                                  <PhotoIcon className="w-1/3 h-1/3 text-gray-400" />
                                                            </div>
                                                      )}
                                          </div>
                                    );
                              })}
                        </div>
                  )}

                  {/* Simple Media Viewer Modal (Could be enhanced) */}
                  {selectedMedia && (
                        <div
                              className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4"
                              onClick={handleCloseViewer}
                        >
                              <div
                                    className="relative max-w-4xl max-h-[90vh]"
                                    onClick={(e) => e.stopPropagation()}
                              >
                                    <button
                                          onClick={handleCloseViewer}
                                          className="absolute -top-8 right-0 text-white text-3xl hover:text-gray-300 z-10"
                                          aria-label="Close viewer"
                                    >
                                          &times;
                                    </button>
                                    {selectedMedia.asset_type === "image" && (
                                          <img
                                                src={
                                                      getAssetPath(
                                                            selectedMedia.asset_key
                                                      )!
                                                }
                                                alt="Full size media"
                                                className="block max-w-full max-h-[90vh] object-contain rounded"
                                          />
                                    )}
                                    {selectedMedia.asset_type === "video" && (
                                          <video
                                                src={
                                                      getAssetPath(
                                                            selectedMedia.asset_key
                                                      )!
                                                }
                                                controls
                                                autoPlay
                                                preload="metadata"
                                                className="block max-w-full max-h-[90vh] object-contain rounded bg-black"
                                          />
                                    )}
                                    <div className="text-center mt-2">
                                          <p className="text-gray-300 text-sm">{`Memory Date: ${format(
                                                new Date(
                                                      selectedMedia.memory_date
                                                ),
                                                "PPP"
                                          )}`}</p>
                                          {selectedMedia.memory_caption && (
                                                <p className="text-gray-200 italic text-sm mt-1">
                                                      {
                                                            selectedMedia.memory_caption
                                                      }
                                                </p>
                                          )}
                                    </div>
                              </div>
                        </div>
                  )}
            </Modal>
      );
};

export default GlobalMediaGalleryModal;
