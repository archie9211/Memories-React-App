import React, { useState, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select/creatable"; // Reuse for tag filtering
import { debounce } from "lodash-es"; // Use lodash debounce: npm install lodash-es @types/lodash-es

interface FilterControlsProps {
      onFilterChange: (filters: Record<string, string | undefined>) => void;
      initialFilters: Record<string, string | undefined>;
}

// Tag options structure (same as AddMemoryForm)
interface TagOption {
      readonly label: string;
      readonly value: string;
}
const createOption = (label: string) => ({
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
      const [showFilters, setShowFilters] = useState(false); // Collapsed by default

      // Debounce the filter change handler to avoid rapid API calls
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const debouncedFilterChange = useCallback(
            debounce((filters: Record<string, string | undefined>) => {
                  onFilterChange(filters);
            }, 500),
            []
      );

      const handleFilterUpdate = (
            newFilters: Record<string, string | undefined>
      ) => {
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
      };

      // --- Handlers for Inputs ---
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
            if (tagInputValue && event.key === "Enter") {
                  event.preventDefault();
                  const newTag = createOption(tagInputValue);
                  setTags((prev) => [...prev, newTag]);
                  setTagInputValue("");
                  handleFilterUpdate({
                        tags:
                              [...tags, newTag].map((t) => t.value).join(",") ||
                              undefined,
                  });
            } else if (
                  tags.length &&
                  event.key === "Backspace" &&
                  !tagInputValue
            ) {
                  const updatedTags = tags.slice(0, -1);
                  setTags(updatedTags);
                  handleFilterUpdate({
                        tags:
                              updatedTags.map((t) => t.value).join(",") ||
                              undefined,
                  });
            }
      };

      const clearFilters = () => {
            setSearchTerm("");
            setLocation("");
            setStartDate(null);
            setEndDate(null);
            setTags([]);
            setTagInputValue("");
            onFilterChange({});
      };

      const toggleFilters = () => {
            setShowFilters((prev) => !prev);
      };

      return (
            <div className="bg-white p-4 rounded-lg shadow mb-6 max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-700">
                              Filters
                        </h2>
                        <button
                              onClick={toggleFilters}
                              className="py-1 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                              {showFilters ? "Hide Filters" : "Show Filters"}
                        </button>
                  </div>
                  {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                          placeholder="Search content, captions, tags..."
                                          value={searchTerm}
                                          onChange={handleSearchChange}
                                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
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
                                          placeholder="Filter by location"
                                          value={location}
                                          onChange={handleLocationChange}
                                          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
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
                                                placeholderText="Start date"
                                                dateFormat="yyyy-MM-dd"
                                                className="w-full"
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
                                                placeholderText="End date"
                                                dateFormat="yyyy-MM-dd"
                                                className="w-full"
                                          />
                                    </div>
                              </div>

                              {/* Tag Filter */}
                              <div className="lg:col-span-2">
                                    <label
                                          htmlFor="tags-filter"
                                          className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                          Filter by Tags (AND)
                                    </label>
                                    <Select
                                          isMulti
                                          isClearable
                                          options={[]} // Optionally fetch available dropdown tags
                                          components={{
                                                DropdownIndicator: null,
                                          }}
                                          inputValue={tagInputValue}
                                          value={tags}
                                          onChange={handleTagChange}
                                          onInputChange={handleTagInputChange}
                                          onKeyDown={handleTagKeyDown}
                                          placeholder="Type tags to filter by..."
                                          className="basic-multi-select"
                                          classNamePrefix="tag-select"
                                    />
                              </div>

                              {/* Clear Button */}
                              <div className="flex items-end justify-end">
                                    <button
                                          onClick={clearFilters}
                                          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                          Clear Filters
                                    </button>
                              </div>
                        </div>
                  )}
            </div>
      );
};

export default FilterControls;
