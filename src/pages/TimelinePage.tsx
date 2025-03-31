import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { Memory, fetchMemories, MemoryFilters } from "../services/api";
import Timeline from "../components/Timeline";
import AddMemoryForm from "../components/AddMemoryForm";
import { MemoryCardSkeleton } from "../components/LoadingSpinner";
import MemoryDetailModal from "../components/MemoryDetailModal"; // Specific component for detail view
import FilterControls from "../components/FilterControls";
import Modal from "../components/Modal";

const PAGE_LIMIT = 10; // Number of memories per page/load

const TimelinePage: React.FC = () => {
      const [memories, setMemories] = useState<Memory[]>([]);
      const [isLoading, setIsLoading] = useState<boolean>(true);
      const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
      const [error, setError] = useState<string | null>(null);
      const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null); // For detail view modal
      const [editingMemory, setEditingMemory] = useState<Memory | null>(null); // Data for edit form modal
      const [isAddEditModalOpen, setIsAddEditModalOpen] =
            useState<boolean>(false); // Controls Add/Edit Modal visibility

      const [filters, setFilters] = useState<MemoryFilters>({
            limit: PAGE_LIMIT,
      });
      const [nextCursor, setNextCursor] = useState<{
            date: string;
            id: string;
      } | null>(null);
      const [hasMore, setHasMore] = useState<boolean>(true);

      const { ref: loadMoreRef, inView } = useInView({
            threshold: 0,
      });

      const sortedMemories = useMemo(
            () =>
                  memories.sort(
                        (a, b) =>
                              new Date(b.memory_date).getTime() -
                              new Date(a.memory_date).getTime()
                  ),
            [memories]
      );

      // --- Fetching Logic ---
      const loadMemories = useCallback(
            async (newFilters: MemoryFilters, reset = false) => {
                  if (reset) {
                        setIsLoading(true);
                        setMemories([]);
                        setNextCursor(null);
                        setHasMore(true);
                  } else {
                        setIsLoadingMore(true);
                  }
                  setError(null);
                  try {
                        const response = await fetchMemories(newFilters);
                        setMemories((prev) =>
                              reset
                                    ? response.memories
                                    : [...prev, ...response.memories]
                        );
                        setNextCursor(response.nextCursor);
                        setHasMore(response.nextCursor !== null);
                  } catch (err: any) {
                        setError(err.message || "Failed to load memories.");
                        setHasMore(false);
                  } finally {
                        setIsLoading(false);
                        setIsLoadingMore(false);
                  }
            },
            []
      ); // Removed dependencies as they are stable or handled internally

      // Initial load
      useEffect(() => {
            loadMemories({ limit: PAGE_LIMIT }, true);
            console.log("memories", memories);
      }, [loadMemories]); // Depends only on the memoized loadMemories

      // Infinite scroll trigger
      useEffect(() => {
            if (
                  inView &&
                  hasMore &&
                  !isLoading &&
                  !isLoadingMore &&
                  nextCursor
            ) {
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

      // Filter change handler
      const handleFilterChange = (
            newFilterValues: Record<string, string | undefined>
      ) => {
            const activeFilters = Object.fromEntries(
                  Object.entries(newFilterValues).filter(
                        ([_, v]) => v !== undefined && v !== ""
                  )
            );
            const updatedFilters = { ...activeFilters, limit: PAGE_LIMIT };
            setFilters(updatedFilters);
            loadMemories(updatedFilters, true); // Reload with new filters
      };

      // --- Modal and Form Handlers ---
      const handleMemorySaved = (savedMemory: Memory) => {
            // Update local state (replace or prepend/sort)
            setMemories((prevMemories) => {
                  const index = prevMemories.findIndex(
                        (m) => m.id === savedMemory.id
                  );
                  let updatedMemories;
                  if (index > -1) {
                        updatedMemories = [...prevMemories];
                        updatedMemories[index] = savedMemory;
                  } else {
                        updatedMemories = [savedMemory, ...prevMemories];
                  }
                  // Ensure sort order is maintained
                  return updatedMemories.sort(
                        (a, b) =>
                              new Date(b.memory_date).getTime() -
                              new Date(a.memory_date).getTime()
                  );
            });
            setIsAddEditModalOpen(false); // Close the Add/Edit modal
            setEditingMemory(null);
            setSelectedMemory(null); // Ensure detail modal is closed
      };

      // Open Detail Modal
      const handleSelectMemory = (memory: Memory) => {
            setSelectedMemory(memory);
            setIsAddEditModalOpen(false); // Close Add/Edit modal if open
      };

      // Open Edit Modal
      const handleEditRequest = (memory: Memory) => {
            setSelectedMemory(null); // Close detail modal
            setEditingMemory(memory); // Set data for the form
            setIsAddEditModalOpen(true); // Open the generic modal for editing
      };

      // Close Detail Modal
      const handleCloseDetailModal = () => {
            setSelectedMemory(null);
      };

      // Close Add/Edit Modal
      const handleCloseAddEditModal = () => {
            setIsAddEditModalOpen(false);
            setEditingMemory(null); // Clear editing state
      };

      // Open Add Modal
      const handleAddNewClick = () => {
            setEditingMemory(null); // Clear any editing state
            setSelectedMemory(null); // Close detail modal if open
            setIsAddEditModalOpen(true); // Open the generic modal for adding
      };

      return (
            <>
                  {" "}
                  {/* Use Fragment */}
                  {/* Button to trigger Add Form Modal */}
                  <div className="text-center mb-6">
                        <button
                              onClick={handleAddNewClick} // Opens the Add/Edit modal in "add" mode
                              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                              <svg
                                    className="-ml-1 mr-3 h-5 w-5"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    aria-hidden="true"
                              >
                                    <path
                                          fillRule="evenodd"
                                          d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                          clipRule="evenodd"
                                    />
                              </svg>
                              Add New Memory
                        </button>
                  </div>
                  {/* Filter Controls */}
                  <FilterControls
                        onFilterChange={handleFilterChange}
                        initialFilters={Object.fromEntries(
                              Object.entries(filters).map(([key, value]) => [
                                    key,
                                    value?.toString(),
                              ])
                        )}
                  />
                  {/* Timeline */}
                  {isLoading && memories.length === 0 ? (
                        <div className="max-w-4xl mx-auto">
                              {[...Array(3)].map((_, index) => (
                                    <MemoryCardSkeleton key={index} />
                              ))}
                        </div>
                  ) : error ? (
                        <p className="text-center text-red-600 mt-8">
                              Error: {error}
                        </p>
                  ) : (
                        <>
                              <Timeline
                                    memories={sortedMemories}
                                    onMemorySelect={handleSelectMemory} // Opens detail modal
                                    onMemoryEdit={handleEditRequest} // Opens edit modal
                                    isLoading={isLoading}
                              />
                              {/* Load More Trigger */}
                              <div
                                    ref={loadMoreRef}
                                    className="h-10 flex justify-center items-center"
                              >
                                    {isLoadingMore && (
                                          <div className="w-full max-w-4xl mx-auto">
                                                <MemoryCardSkeleton />
                                          </div>
                                    )}
                                    {!isLoadingMore &&
                                          !hasMore &&
                                          memories.length > 0 && (
                                                <p className="text-gray-500">
                                                      End of memories.
                                                </p>
                                          )}
                              </div>
                        </>
                  )}
                  {/* Detail Modal - Rendered Conditionally. Handles its own modal styling (including blur) */}
                  {selectedMemory && (
                        <MemoryDetailModal
                              memory={selectedMemory}
                              onClose={handleCloseDetailModal}
                              onEditRequest={handleEditRequest} // Allows opening Edit modal from Detail view
                        />
                  )}
                  {/* Add/Edit Form Modal - Uses the generic Modal component */}
                  <Modal
                        isOpen={isAddEditModalOpen}
                        onClose={handleCloseAddEditModal}
                        title={editingMemory ? "Edit Memory" : "Add New Memory"}
                        // useBlur={false} // Form modal doesn't need blur by default, but you could add useBlur={true}
                  >
                        {/* Conditionally render AddMemoryForm only when modal is open to ensure state resets correctly via key */}
                        {isAddEditModalOpen && (
                              <AddMemoryForm
                                    key={
                                          editingMemory
                                                ? editingMemory.id
                                                : "add-new"
                                    } // Force re-mount on mode switch
                                    onMemorySaved={handleMemorySaved}
                                    existingMemory={editingMemory}
                                    onCancel={handleCloseAddEditModal} // Use modal's close handler
                              />
                        )}
                  </Modal>
            </>
      );
};

export default TimelinePage;
