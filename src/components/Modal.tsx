// src/components/Modal.tsx
import React, { useEffect } from "react";

interface ModalProps {
      isOpen: boolean; // Controls whether the modal is visible
      onClose: () => void; // Function to call when closing the modal (e.g., clicking backdrop or close button)
      children: React.ReactNode; // The content to render inside the modal
      title?: string; // Optional title displayed at the top of the modal
      useBlur?: boolean; // Optional flag: if true, uses a blurred backdrop, otherwise a dark overlay
      maxWidth?: string; // Optional: Tailwind max-width class (e.g., 'max-w-md', 'max-w-xl', 'max-w-3xl'). Defaults below.
}

const Modal: React.FC<ModalProps> = ({
      isOpen,
      onClose,
      children,
      title,
      useBlur = true, // Default to dark overlay if not specified
      maxWidth = "max-w-2xl", // Default max-width suitable for forms
}) => {
      useEffect(() => {
            if (isOpen) {
                  document.body.style.overflow = "hidden";
            } else {
                  document.body.style.overflow = "unset";
            }

            return () => {
                  document.body.style.overflow = "unset";
            };
      }, [isOpen]);

      // Don't render anything if the modal is not open
      if (!isOpen) return null;

      // Determine backdrop classes based on the useBlur prop
      const backdropClasses = useBlur
            ? "fixed inset-0 bg-gray-500 bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out"
            : "fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out";

      return (
            <div
                  className={backdropClasses}
                  onClick={onClose} // Close the modal when the backdrop (overlay) is clicked
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={title ? "modal-title" : undefined}
                  aria-describedby={title ? undefined : "modal-description"} // Add if no title but content describes it
            >
                  <dialog
                        open={isOpen}
                        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto p-6 relative transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-fade-in m-0`}
                        onClick={(e) => e.stopPropagation()} // VERY IMPORTANT: Prevent clicks inside the modal content from closing the modal
                        aria-labelledby={title ? "modal-title" : undefined}
                        aria-describedby={
                              title ? undefined : "modal-description"
                        }
                  >
                        {/* Close ('X') Button */}
                        <button
                              onClick={onClose}
                              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl leading-none font-semibold outline-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded-full p-1 z-10" // Added focus ring and padding
                              aria-label="Close modal"
                        >
                              ×
                        </button>

                        {/* Optional Title */}
                        {title && (
                              <h2
                                    id="modal-title"
                                    className="text-xl font-semibold mb-4 text-gray-800 pr-8"
                              >
                                    {" "}
                                    {/* Added padding-right for close button */}
                                    {title}
                              </h2>
                        )}

                        {/* Render the children passed to the modal */}
                        <div id={!title ? "modal-description" : undefined}>
                              {children}
                        </div>
                  </dialog>

                  {/* Add CSS for animation if desired */}
                  <style>{`
                        @keyframes modal-fade-in {
                              from {
                                    opacity: 0;
                                    transform: scale(0.95);
                              }
                              to {
                                    opacity: 1;
                                    transform: scale(1);
                              }
                        }
                        .animate-modal-fade-in {
                              animation: modal-fade-in 0.3s ease-out forwards;
                        }
                        dialog::backdrop {
                              display: none;
                        }
                        dialog {
                              pointer-events: auto;
                        }
                  `}</style>
            </div> // End Modal Backdrop
      );
};

export default Modal;
