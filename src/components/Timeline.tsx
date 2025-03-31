import React from "react";
import { Memory } from "../services/api";
import MemoryCard from "./MemoryCard";
import { MemoryCardSkeleton } from "./LoadingSpinner";

interface TimelineProps {
      memories: Memory[];
      onMemorySelect: (memory: Memory) => void;
      onMemoryEdit: (memory: Memory) => void;
      isLoading: boolean; // Add this prop
}

const Timeline: React.FC<TimelineProps> = ({
      memories,
      onMemorySelect,
      onMemoryEdit,
      isLoading,
}) => {
      if (isLoading) {
            return (
                  <div className="relative mx-auto px-4">
                        {[...Array(3)].map((_, index) => (
                              <div key={index} className="mb-8">
                                    <MemoryCardSkeleton />
                              </div>
                        ))}
                  </div>
            );
      }

      if (!memories.length) {
            return (
                  <p className="text-center text-gray-500 mt-8">
                        No memories found matching your criteria.
                  </p>
            );
      }

      return (
            <div className="relative mx-auto px-4">
                  {" "}
                  {/* Changed from max-w-2xl to max-w-4xl */}
                  {/* Timeline Line */}
                  <div className="absolute left-4 sm:left-1/2 sm:-translate-x-1/2 top-0 bottom-0 w-1 bg-gray-300 rounded hidden sm:block"></div>
                  {memories.map((memory, index) => (
                        <div
                              key={memory.id}
                              className={`relative mb-8 sm:flex ${
                                    index % 2 === 0
                                          ? "sm:justify-start"
                                          : "sm:justify-end"
                              }`}
                        >
                              {/* Dot - Centered on the line for larger screens */}
                              <div className="absolute left-[12px] sm:left-1/2 top-1 sm:top-6 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow -translate-x-1/2 z-10"></div>

                              {/* Increased card width from calc(50%-2rem) to calc(50%-1rem) */}
                              <div className="w-full sm:w-[calc(50%-1rem)]">
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
