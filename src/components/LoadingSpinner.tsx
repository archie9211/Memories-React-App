// src/components/LoadingSpinner.tsx
import React from "react";

const LoadingSpinner: React.FC<{ size?: "small" | "medium" | "large" }> = ({
      size = "medium",
}) => {
      const sizeClasses = {
            small: "h-8 w-8 border-2",
            medium: "h-12 w-12 border-t-2 border-b-2",
            large: "h-16 w-16 border-t-4 border-b-4",
      };
      return (
            <div className="flex justify-center items-center my-12">
                  <div
                        className={`animate-spin rounded-full border-indigo-500 ${sizeClasses[size]}`}
                  ></div>
            </div>
      );
};

// Skeleton remains visually similar but uses Timeline's max-width context now
export const MemoryCardSkeleton: React.FC = () => (
      <div className="animate-pulse bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex justify-between mb-3">
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/6"></div>
            </div>
            <div className="h-32 md:h-40 bg-gray-200 rounded mb-4"></div>{" "}
            {/* Image/Video area */}
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>{" "}
            {/* Caption/Content line */}
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>{" "}
            {/* Tags/Footer line */}
      </div>
);

export default LoadingSpinner;
