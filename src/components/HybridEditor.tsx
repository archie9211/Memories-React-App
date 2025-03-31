import React, { useRef, useMemo } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { uploadAsset, getAssetPath } from "../services/api"; // <-- Import new services
import toast from "react-hot-toast";

interface HybridEditorProps {
      value: string;
      onChange: (value: string) => void;
      readOnly?: boolean;
}

const HybridEditor: React.FC<HybridEditorProps> = ({
      value,
      onChange,
      readOnly = false,
}) => {
      const quillRef = useRef<ReactQuill>(null);

      // --- Image Upload Handler ---
      const imageHandler = () => {
            if (!quillRef.current) return;
            const quill = quillRef.current.getEditor();
            const input = document.createElement("input");
            input.setAttribute("type", "file");
            input.setAttribute("accept", "image/*");
            input.click();

            input.onchange = async () => {
                  const file = input.files ? input.files[0] : null;
                  if (!file) return;

                  const range = quill.getSelection(true); // Save cursor position
                  quill.enable(false); // Disable editor during upload
                  const loadingToastId = toast.loading("Uploading image...");

                  try {
                        // *** NEW UPLOAD LOGIC ***
                        const uploadResponse = await uploadAsset(file);
                        const assetPath = getAssetPath(uploadResponse.key); // Get direct path
                        if (!assetPath)
                              throw new Error(
                                    "Failed to construct asset path."
                              );

                        // 4. Insert image into Quill
                        quill.insertEmbed(range.index, "image", assetPath);
                        quill.setSelection(range.index + 1, 0); // Move cursor after image

                        toast.success("Image uploaded!", {
                              id: loadingToastId,
                        });
                  } catch (error: any) {
                        console.error("Image upload failed:", error);
                        toast.error(
                              `Image upload failed: ${
                                    error.message || "Unknown error"
                              }`,
                              { id: loadingToastId }
                        );
                  } finally {
                        quill.enable(true); // Re-enable editor
                        quill.focus(); // Refocus editor
                  }
            };
      };

      // --- Video Upload Handler (Similar to Image) ---
      const videoHandler = () => {
            if (!quillRef.current) return;
            const quill = quillRef.current.getEditor();
            // ... (Logic very similar to imageHandler, accept 'video/*') ...
            const input = document.createElement("input");
            input.setAttribute("type", "file");
            input.setAttribute("accept", "video/*");
            input.click();

            input.onchange = async () => {
                  const file = input.files ? input.files[0] : null;
                  // ... (rest of the try/catch block like imageHandler, insert 'video' type)
                  if (!file) return;
                  const range = quill.getSelection(true);
                  quill.enable(false);
                  const loadingToastId = toast.loading("Uploading video...");
                  try {
                        const uploadResponse = await uploadAsset(file);
                        const assetPath = getAssetPath(uploadResponse.key);
                        if (!assetPath)
                              throw new Error(
                                    "Failed to construct asset path."
                              );
                        // *** END NEW UPLOAD LOGIC ***

                        quill.insertEmbed(range.index, "video", assetPath); // Insert direct path
                        quill.setSelection(range.index + 1, 0); // Move cursor after image
                        toast.success("Video uploaded!", {
                              id: loadingToastId,
                        });
                  } catch (error: any) {
                        console.error("Video upload failed:", error);
                        toast.error(
                              `Video upload failed: ${
                                    error.message || "Unknown error"
                              }`,
                              { id: loadingToastId }
                        );
                  } finally {
                        quill.enable(true);
                        quill.focus();
                  }
            };
      };

      // Memoize modules to prevent Quill re-initialization on every render
      const modules = useMemo(
            () => ({
                  toolbar: {
                        container: [
                              [{ header: [1, 2, 3, false] }],
                              [
                                    "bold",
                                    "italic",
                                    "underline",
                                    "strike",
                                    "blockquote",
                              ],
                              [
                                    { list: "ordered" },
                                    { list: "bullet" },
                                    { indent: "-1" },
                                    { indent: "+1" },
                              ],
                              ["link", "image", "video"], // Enable image/video buttons
                              ["clean"],
                        ],
                        handlers: {
                              image: imageHandler, // Assign custom handlers
                              video: videoHandler,
                        },
                  },
            }),
            []
      ); // Empty dependency array ensures it's created only once

      const formats = [
            "header",
            "bold",
            "italic",
            "underline",
            "strike",
            "blockquote",
            "list",
            "bullet",
            "indent",
            "link",
            "image",
            "video", // Add formats
      ];

      return (
            <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={value}
                  onChange={onChange}
                  modules={modules}
                  formats={formats}
                  placeholder="Compose your memory..."
                  readOnly={readOnly}
                  className={readOnly ? "border-none" : ""} // Optional: remove border in read-only
            />
      );
};

export default HybridEditor;
