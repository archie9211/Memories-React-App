// src/pages/TimelinePage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { Memory, fetchMemories, MemoryFilters } from "../services/api"; // Memory type updated
import Timeline from "../components/Timeline";
import AddMemoryForm from "../components/AddMemoryForm";
import { MemoryCardSkeleton } from "../components/LoadingSpinner";
import MemoryDetailModal from "../components/MemoryDetailModal";
import FilterControls from "../components/FilterControls";
import Modal from "../components/Modal"; // Generic modal for Add/Edit
import { PlusIcon } from "@heroicons/react/20/solid"; // Use Heroicon

const PAGE_LIMIT = 10;

const TimelinePage: React.FC = () => {
      const [memories, setMemories] = useState<Memory[]>([]); // Uses updated Memory type
      const [isLoading, setIsLoading] = useState<boolean>(true);
      const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
      const [error, setError] = useState<string | null>(null);
      const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
      const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
      const [isAddEditModalOpen, setIsAddEditModalOpen] =
            useState<boolean>(false);

      const [filters, setFilters] = useState<MemoryFilters>({
            limit: PAGE_LIMIT,
      });
      const [nextCursor, setNextCursor] = useState<{
            date: string;
            id: string;
      } | null>(null);
      const [hasMore, setHasMore] = useState<boolean>(true);

      const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 }); // Slightly higher threshold

      // Sort memories (unchanged logic)
      const sortedMemories = useMemo(
            () =>
                  memories.sort(
                        (a, b) =>
                              new Date(b.memory_date).getTime() -
                              new Date(a.memory_date).getTime()
                  ),
            [memories]
      );

      // Fetching Logic (unchanged logic, relies on updated fetchMemories)
      const loadMemories = useCallback(
            async (newFilters: MemoryFilters, reset = false) => {
                  // ... implementation remains the same ...
                  if (reset) {
                        setIsLoading(true);
                        setMemories([]);
                        setNextCursor(null);
                        setHasMore(true);
                  } else {
                        setIsLoadingMore(true);
                  }
                  setError(null);
                  console.log("Loading memories with filters:", newFilters); // Debugging
                  try {
                        const response = await fetchMemories(newFilters);
                        console.log("API Response:", response); // Debugging
                        setMemories((prev) =>
                              reset
                                    ? response.memories
                                    : [...prev, ...response.memories]
                        );
                        setNextCursor(response.nextCursor);
                        setHasMore(
                              response.nextCursor !== null &&
                                    response.memories.length > 0
                        ); // Ensure hasMore is true only if data received
                  } catch (err: any) {
                        setError(err.message || "Failed to load memories.");
                        setHasMore(false);
                  } finally {
                        setIsLoading(false);
                        setIsLoadingMore(false);
                  }
            },
            []
      ); // No dependencies needed here

      // Initial load (unchanged)
      useEffect(() => {
            loadMemories({ limit: PAGE_LIMIT }, true);
      }, [loadMemories]);

      // Infinite scroll trigger (unchanged logic)
      useEffect(() => {
            if (
                  inView &&
                  hasMore &&
                  !isLoading &&
                  !isLoadingMore &&
                  nextCursor
            ) {
                  console.log("Loading more...", nextCursor); // Debugging
                  loadMemories(
                        {
                              ...filters,
                              limit: PAGE_LIMIT,
                              cursorDate: nextCursor.date,
                              cursorId: nextCursor.id,
                        },
                        false
                  );
            }
      }, [
            inView,
            hasMore,
            isLoading,
            isLoadingMore,
            nextCursor,
            filters,
            loadMemories,
      ]);

      // Filter change handler (unchanged)
      const handleFilterChange = (
            newFilterValues: Record<string, string | undefined>
      ) => {
            const activeFilters = Object.fromEntries(
                  Object.entries(newFilterValues).filter(
                        ([_, v]) => v !== undefined && v !== ""
                  )
            );
            const updatedFilters = { ...activeFilters, limit: PAGE_LIMIT };
            console.log("Applying filters:", updatedFilters); // Debugging
            setFilters(updatedFilters);
            loadMemories(updatedFilters, true);
      };

      // --- Modal and Form Handlers ---
      const handleMemorySaved = (savedMemory: Memory) => {
            setMemories((prevMemories) => {
                  const index = prevMemories.findIndex(
                        (m) => m.id === savedMemory.id
                  );
                  let updatedMemories;
                  if (index > -1) {
                        // Update existing
                        updatedMemories = [...prevMemories];
                        updatedMemories[index] = savedMemory;
                  } else {
                        // Add new
                        updatedMemories = [savedMemory, ...prevMemories];
                  }
                  // Re-sort after add/update
                  return updatedMemories.sort(
                        (a, b) =>
                              new Date(b.memory_date).getTime() -
                              new Date(a.memory_date).getTime()
                  );
            });
            setIsAddEditModalOpen(false);
            setEditingMemory(null);
            setSelectedMemory(null); // Close detail modal if it was open via edit request
      };

      const handleSelectMemory = (memory: Memory) => {
            setSelectedMemory(memory);
            setIsAddEditModalOpen(false);
      };

      const handleEditRequest = (memory: Memory) => {
            setSelectedMemory(null);
            setEditingMemory(memory);
            setIsAddEditModalOpen(true);
      };

      const handleCloseDetailModal = () => {
            setSelectedMemory(null);
      };
      const handleCloseAddEditModal = () => {
            setIsAddEditModalOpen(false);
            setEditingMemory(null);
      };
      const handleAddNewClick = () => {
            setEditingMemory(null);
            setSelectedMemory(null);
            setIsAddEditModalOpen(true);
      };

      return (
            <>
                  {/* Add New Memory Button - Centered */}
                  <div className="text-center mb-8">
                        <button
                              onClick={handleAddNewClick}
                              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
                        >
                              <PlusIcon
                                    className="-ml-1 mr-2 h-5 w-5"
                                    aria-hidden="true"
                              />
                              Add New Memory
                        </button>
                  </div>

                  {/* Filter Controls */}
                  <FilterControls
                        onFilterChange={handleFilterChange}
                        initialFilters={
                              filters as Record<string, string | undefined>
                        }
                  />

                  {/* Loading State / Error State / Timeline */}
                  {isLoading && memories.length === 0 ? (
                        // Initial loading skeleton
                        <div className="max-w-3xl mx-auto">
                              {" "}
                              {/* Use Timeline's max-width */}
                              {[...Array(3)].map((_, index) => (
                                    <MemoryCardSkeleton key={index} />
                              ))}
                        </div>
                  ) : error ? (
                        <p className="text-center text-red-600 mt-8 bg-red-100 p-4 rounded-md">
                              Error: {error}
                        </p>
                  ) : !isLoading && memories.length === 0 ? (
                        // No results state after loading/filtering
                        <p className="text-center text-gray-600 mt-8 bg-yellow-100 p-4 rounded-md">
                              No memories found
                              {Object.keys(filters).filter((k) => k !== "limit")
                                    .length > 0
                                    ? " matching your filters"
                                    : ""}
                              . Try adding one!
                        </p>
                  ) : (
                        // Timeline and Load More
                        <>
                              <Timeline
                                    memories={sortedMemories}
                                    onMemorySelect={handleSelectMemory}
                                    onMemoryEdit={handleEditRequest}
                              />
                              {/* Load More Trigger / Indicator */}
                              <div
                                    ref={loadMoreRef}
                                    className="h-20 flex justify-center items-center mt-6"
                              >
                                    {isLoadingMore ? (
                                          <div className="w-full max-w-3xl mx-auto">
                                                {" "}
                                                <MemoryCardSkeleton />{" "}
                                          </div>
                                    ) : !hasMore && memories.length > 0 ? (
                                          <p className="text-gray-500">
                                                End of timeline.
                                          </p>
                                    ) : null}
                              </div>
                        </>
                  )}

                  {/* Detail Modal - Renders based on selectedMemory state */}
                  {selectedMemory && (
                        <MemoryDetailModal
                              memory={selectedMemory}
                              onClose={handleCloseDetailModal}
                              onEditRequest={handleEditRequest}
                        />
                  )}

                  {/* Add/Edit Form Modal - Uses the generic Modal */}
                  <Modal
                        isOpen={isAddEditModalOpen}
                        onClose={handleCloseAddEditModal}
                        title={editingMemory ? "Edit Memory" : "Add New Memory"}
                        maxWidth="max-w-3xl" // Wider modal for form
                        useBlur={false} // Use dark overlay for form modal
                  >
                        {/* Render form only when modal is open, use key to force reset */}
                        {isAddEditModalOpen && (
                              <AddMemoryForm
                                    key={
                                          editingMemory
                                                ? editingMemory.id
                                                : "add-new"
                                    }
                                    onMemorySaved={handleMemorySaved}
                                    existingMemory={editingMemory}
                                    onCancel={handleCloseAddEditModal}
                              />
                        )}
                  </Modal>
            </>
      );
};

export default TimelinePage;
