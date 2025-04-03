// src/components/FilterControls.tsx
import React, { useState, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // Keep base styles
import "./datepicker-custom.css"; // Import custom styles (create this file)
import Select from "react-select/creatable";
import { debounce } from "lodash-es";
import {
      AdjustmentsHorizontalIcon,
      XMarkIcon,
      ChevronDownIcon,
      ChevronUpIcon,
} from "@heroicons/react/24/outline";

interface FilterControlsProps {
      onFilterChange: (filters: Record<string, string | undefined>) => void;
      initialFilters: Record<string, string | undefined>;
}

interface TagOption {
      readonly label: string;
      readonly value: string;
}
const createOption = (label: string): TagOption => ({
      label,
      value: label.toLowerCase().trim(),
});

const FilterControls: React.FC<FilterControlsProps> = ({
      onFilterChange,
      initialFilters,
}) => {
      const [searchTerm, setSearchTerm] = useState(initialFilters.q || "");
      const [location, setLocation] = useState(initialFilters.location || "");
      const [startDate, setStartDate] = useState<Date | null>(
            initialFilters.startDate ? new Date(initialFilters.startDate) : null
      );
      const [endDate, setEndDate] = useState<Date | null>(
            initialFilters.endDate ? new Date(initialFilters.endDate) : null
      );
      const [tags, setTags] = useState<readonly TagOption[]>(
            initialFilters.tags
                  ? initialFilters.tags.split(",").map(createOption)
                  : []
      );
      const [tagInputValue, setTagInputValue] = useState("");
      const [showFilters, setShowFilters] = useState(false); // Start collapsed

      // Debounced filter update (unchanged)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const debouncedFilterChange = useCallback(
            debounce((filters) => {
                  onFilterChange(filters);
            }, 500),
            []
      );

      const handleFilterUpdate = useCallback(
            (newFilters: Record<string, string | undefined>) => {
                  const currentFilters = {
                        q: searchTerm || undefined,
                        location: location || undefined,
                        startDate: startDate
                              ? startDate.toISOString().split("T")[0]
                              : undefined,
                        endDate: endDate
                              ? endDate.toISOString().split("T")[0]
                              : undefined,
                        tags: tags.map((t) => t.value).join(",") || undefined,
                  };
                  debouncedFilterChange({ ...currentFilters, ...newFilters });
            },
            [
                  searchTerm,
                  location,
                  startDate,
                  endDate,
                  tags,
                  debouncedFilterChange,
            ]
      );

      // --- Input Handlers ---
      const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchTerm(e.target.value);
            handleFilterUpdate({ q: e.target.value || undefined });
      };
      const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setLocation(e.target.value);
            handleFilterUpdate({ location: e.target.value || undefined });
      };
      const handleStartDateChange = (date: Date | null) => {
            setStartDate(date);
            if (date && endDate && date > endDate) setEndDate(date);
            handleFilterUpdate({
                  startDate: date
                        ? date.toISOString().split("T")[0]
                        : undefined,
            });
      };
      const handleEndDateChange = (date: Date | null) => {
            setEndDate(date);
            handleFilterUpdate({
                  endDate: date ? date.toISOString().split("T")[0] : undefined,
            });
      };
      const handleTagChange = (newValue: readonly TagOption[]) => {
            setTags(newValue);
            handleFilterUpdate({
                  tags: newValue.map((t) => t.value).join(",") || undefined,
            });
      };
      const handleTagInputChange = (inputValue: string) => {
            setTagInputValue(inputValue);
      };
      const handleTagKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
            /* ... unchanged ... */
            if (!tagInputValue) {
                  // Handle backspace to delete last tag
                  if (event.key === "Backspace" && tags.length > 0) {
                        event.preventDefault();
                        const updatedTags = tags.slice(0, -1);
                        setTags(updatedTags);
                        handleFilterUpdate({
                              tags:
                                    updatedTags.map((t) => t.value).join(",") ||
                                    undefined,
                        });
                  }
                  return;
            }
            switch (event.key) {
                  case "Enter":
                  case "Tab":
                  case ",":
                        event.preventDefault();
                        const newTag = tagInputValue.trim();
                        if (
                              newTag &&
                              !tags.some(
                                    (tag) => tag.value === newTag.toLowerCase()
                              )
                        ) {
                              setTags((prev) => [
                                    ...prev,
                                    createOption(newTag),
                              ]);
                              handleFilterUpdate({
                                    tags:
                                          [...tags, createOption(newTag)]
                                                .map((t) => t.value)
                                                .join(",") || undefined,
                              });
                        }
                        setTagInputValue("");
                        break;
                  default:
                        break;
            }
      };

      const clearFilters = () => {
            setSearchTerm("");
            setLocation("");
            setStartDate(null);
            setEndDate(null);
            setTags([]);
            setTagInputValue("");
            onFilterChange({}); // Trigger immediate update with empty filters
      };

      const toggleFilters = () => setShowFilters((prev) => !prev);

      const hasActiveFilters =
            !!searchTerm ||
            !!location ||
            !!startDate ||
            !!endDate ||
            tags.length > 0;

      return (
            // Use max-w-3xl to match timeline width
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 max-w-3xl mx-auto border border-gray-200">
                  <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                              <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-500" />
                              <h2 className="text-md font-semibold text-gray-700">
                                    Filter Memories
                              </h2>
                              {hasActiveFilters && (
                                    <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-1.5 py-0.5 rounded-full">
                                          Active
                                    </span>
                              )}
                        </div>

                        <div className="flex items-center space-x-2">
                              {hasActiveFilters && (
                                    <button
                                          onClick={clearFilters}
                                          className="text-xs text-gray-500 hover:text-red-600 flex items-center space-x-1 p-1 rounded hover:bg-red-50"
                                          title="Clear Filters"
                                    >
                                          <XMarkIcon className="w-3.5 h-3.5" />
                                          <span>Clear</span>
                                    </button>
                              )}
                              <button
                                    onClick={toggleFilters}
                                    className="py-1 px-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 flex items-center"
                              >
                                    {showFilters ? (
                                          <ChevronUpIcon className="w-4 h-4" />
                                    ) : (
                                          <ChevronDownIcon className="w-4 h-4" />
                                    )}
                                    {/* <span className="ml-1">{showFilters ? "Hide" : "Show"}</span> */}
                              </button>
                        </div>
                  </div>

                  {/* Collapsible Filter Area */}
                  {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Text Search */}
                              <div>
                                    <label
                                          htmlFor="search"
                                          className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                          Search Text
                                    </label>
                                    <input
                                          type="text"
                                          id="search"
                                          placeholder="Keywords..."
                                          value={searchTerm}
                                          onChange={handleSearchChange}
                                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                              </div>
                              {/* Location Search */}
                              <div>
                                    <label
                                          htmlFor="location-filter"
                                          className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                          Location
                                    </label>
                                    <input
                                          type="text"
                                          id="location-filter"
                                          placeholder="City, Place..."
                                          value={location}
                                          onChange={handleLocationChange}
                                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    />
                              </div>
                              {/* Date Range */}
                              <div className="grid grid-cols-2 gap-2">
                                    <div>
                                          <label
                                                htmlFor="startDate"
                                                className="block text-sm font-medium text-gray-700 mb-1"
                                          >
                                                Start Date
                                          </label>
                                          <DatePicker
                                                selected={startDate}
                                                onChange={handleStartDateChange}
                                                selectsStart
                                                startDate={startDate}
                                                endDate={endDate}
                                                isClearable
                                                placeholderText="From..."
                                                dateFormat="yyyy-MM-dd"
                                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                wrapperClassName="w-full"
                                          />
                                    </div>
                                    <div>
                                          <label
                                                htmlFor="endDate"
                                                className="block text-sm font-medium text-gray-700 mb-1"
                                          >
                                                End Date
                                          </label>
                                          <DatePicker
                                                selected={endDate}
                                                onChange={handleEndDateChange}
                                                selectsEnd
                                                startDate={startDate}
                                                endDate={endDate}
                                                isClearable
                                                placeholderText="To..."
                                                dateFormat="yyyy-MM-dd"
                                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                wrapperClassName="w-full"
                                          />
                                    </div>
                              </div>
                              {/* Tag Filter */}
                              <div>
                                    <label
                                          htmlFor="tags-filter"
                                          className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                          Tags (AND)
                                    </label>
                                    <Select /* ... props ... */
                                          isMulti
                                          isClearable
                                          options={[]} // No predefined options needed for creatable
                                          components={{
                                                DropdownIndicator: null,
                                          }}
                                          inputValue={tagInputValue}
                                          value={tags}
                                          onChange={handleTagChange}
                                          onInputChange={handleTagInputChange}
                                          onKeyDown={handleTagKeyDown}
                                          placeholder="Type tags..."
                                          className="basic-multi-select text-sm"
                                          classNamePrefix="tag-select"
                                    />
                              </div>
                        </div>
                  )}
            </div>
      );
};

export default FilterControls;
