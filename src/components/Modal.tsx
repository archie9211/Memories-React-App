// src/components/Modal.tsx
import React, { useEffect } from "react";

interface ModalProps {
      isOpen: boolean;
      onClose: () => void;
      children: React.ReactNode;
      title?: string;
      useBlur?: boolean;
      maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({
      isOpen,
      onClose,
      children,
      title,
      useBlur = true,
      maxWidth = "max-w-2xl",
}) => {
      // Move scroll lock logic here
      useEffect(() => {
            if (isOpen) {
                  // Get the original body overflow and padding
                  const originalStyle = window.getComputedStyle(document.body);
                  const originalOverflow = originalStyle.overflow;
                  const originalPaddingRight = originalStyle.paddingRight;

                  // Get width of scrollbar
                  const scrollBarWidth =
                        window.innerWidth -
                        document.documentElement.clientWidth;

                  // Prevent scroll
                  document.body.style.overflow = "hidden";
                  document.body.style.paddingRight = `${scrollBarWidth}px`;

                  // Cleanup function
                  return () => {
                        document.body.style.overflow = originalOverflow;
                        document.body.style.paddingRight = originalPaddingRight;
                  };
            }
      }, [isOpen]); // Depend on isOpen to properly handle cleanup

      if (!isOpen) return null;

      const backdropClasses = useBlur
            ? "fixed inset-0 bg-gray-800 bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out" // Slightly darker blur bg
            : "fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out";

      return (
            <div
                  className={backdropClasses}
                  onClick={onClose}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={title ? "modal-title" : undefined}
                  aria-describedby={title ? undefined : "modal-description"}
            >
                  {/* Using <dialog> causes issues with positioning/styling in some cases, revert to div */}
                  <div
                        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-fade-in m-0`}
                        onClick={(e) => e.stopPropagation()}
                        role="document" // More appropriate role for the content container
                        aria-labelledby={title ? "modal-title" : undefined}
                        aria-describedby={
                              title ? undefined : "modal-description"
                        }
                  >
                        {/* Modal Header (optional) */}
                        {title && (
                              <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                                    {title ? (
                                          <h2
                                                id="modal-title"
                                                className="text-lg font-semibold text-gray-800"
                                          >
                                                {title}
                                          </h2>
                                    ) : (
                                          <div />
                                    )}{" "}
                                    {/* Placeholder to keep button right */}
                                    <button
                                          onClick={onClose}
                                          className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                          aria-label="Close modal"
                                    >
                                          <svg
                                                className="h-6 w-6"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                          >
                                                <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M6 18L18 6M6 6l12 12"
                                                />
                                          </svg>
                                    </button>
                              </div>
                        )}

                        {/* Modal Body - Scrollable */}
                        <div
                              id={!title ? "modal-description" : undefined}
                              className="p-6 overflow-y-auto flex-grow"
                        >
                              {children}
                        </div>

                        {/* Optional Footer Area - Could be passed as a prop if needed */}
                        {/* <div className="p-4 border-t border-gray-200 flex-shrink-0"> Footer Content </div> */}
                  </div>{" "}
                  {/* End Modal Content Container */}
                  {/* Animation Styles (remain the same) */}
                  <style>{`
                @keyframes modal-fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-modal-fade-in { animation: modal-fade-in 0.2s ease-out forwards; }
                /* Ensure backdrop allows clicks through to the main div for closing */
                /* div[role="dialog"] { pointer-events: none; } */
                 /* Ensure modal content receives clicks */
                /* div[role="document"] { pointer-events: auto; } */
            `}</style>
            </div> // End Modal Backdrop
      );
};

export default Modal;
