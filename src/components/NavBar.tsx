// src/components/NavBar.tsx
import React from "react";
import { PhotoIcon } from "@heroicons/react/24/outline"; // Using Heroicons (npm install @heroicons/react)

interface NavBarProps {
      title?: string | null;
      onGalleryClick: () => void; // Callback to open the global gallery
}

const NavBar: React.FC<NavBarProps> = ({ title, onGalleryClick }) => {
      return (
            <nav className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 shadow-lg sticky top-0 z-40">
                  {" "}
                  {/* Made sticky */}
                  <div className="container mx-auto flex justify-between items-center px-4">
                        {/* Left side: Logo and Title */}
                        <div className="flex items-center space-x-3">
                              <img
                                    src="/NavBar.png" // Consider a simpler/smaller logo for navbar
                                    alt="Logo"
                                    className="h-10 md:h-12 object-contain" // Adjusted size
                              />
                              {title && (
                                    <span className="text-xl md:text-2xl font-semibold tracking-tight hidden sm:block">
                                          {" "}
                                          {/* Hide title on very small screens */}
                                          {title}
                                    </span>
                              )}
                        </div>

                        {/* Right side: Global Gallery Button */}
                        <button
                              onClick={onGalleryClick}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white transition ease-in-out duration-150"
                              aria-label="View All Media"
                        >
                              <PhotoIcon
                                    className="h-5 w-5 mr-1.5"
                                    aria-hidden="true"
                              />
                              All Media
                        </button>
                  </div>
            </nav>
      );
};

export default NavBar;
