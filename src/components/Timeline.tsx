// src/components/Timeline.tsx
import React from "react";
import { Memory } from "../services/api";
import MemoryCard from "./MemoryCard";
// Removed Skeleton import, loading handled by parent

interface TimelineProps {
      memories: Memory[];
      onMemorySelect: (memory: Memory) => void;
      onMemoryEdit: (memory: Memory) => void;
      // isLoading prop is removed, parent handles loading state display
}

const Timeline: React.FC<TimelineProps> = ({
      memories,
      onMemorySelect,
      onMemoryEdit,
}) => {
      // Parent now handles the "no memories" case after loading/filtering
      // if (!memories.length) {
      //      return ( /* ... no memories message ... */ );
      // }

      return (
            // Use max-w-3xl for better card readability on wider screens
            <div className="relative mx-auto px-4">
                  {/* Vertical Timeline Line */}
                  {/* Show line only if there are memories */}
                  {memories.length > 0 && (
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200 rounded hidden sm:block sm:left-1/2 sm:-translate-x-1/2"></div>
                  )}

                  {memories.map((memory, index) => (
                        <div
                              key={memory.id}
                              // Sm screens: Card takes full width
                              // Md screens and up: Alternating layout
                              className={`relative mb-8 sm:flex ${
                                    index % 2 === 0
                                          ? "sm:justify-start"
                                          : "sm:justify-end"
                              }`}
                        >
                              {/* Dot Indicator */}
                              <div className="absolute left-[10px] sm:left-1/2 top-5 w-5 h-5 bg-white rounded-full border-4 border-indigo-500 shadow -translate-x-1/2 z-10 hidden sm:block"></div>{" "}
                              {/* Adjusted style/position */}
                              {/* Mobile Connector line (optional) */}
                              <div className="absolute left-[15px] top-6 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200 rounded block sm:hidden"></div>
                              <div className="absolute left-[11px] top-5 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow block sm:hidden z-10"></div>{" "}
                              {/* Mobile Dot */}
                              {/* Memory Card Container */}
                              {/* Sm screens: Margin-left to not overlap mobile dot/line */}
                              {/* Md screens and up: 50% width minus gap */}
                              <div className="ml-8 sm:ml-0 sm:w-[calc(50%-2rem)]">
                                    {" "}
                                    {/* Increased gap to 2rem */}
                                    <MemoryCard
                                          memory={memory}
                                          onCardClick={onMemorySelect}
                                          onEditClick={onMemoryEdit}
                                    />
                              </div>
                        </div>
                  ))}
            </div>
      );
};

export default Timeline;
