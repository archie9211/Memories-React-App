// Option 1: Keep CSS (LoadingSpinner.css needs to be imported)
// import './LoadingSpinner.css';
// const LoadingSpinner: React.FC = () => <div className="loader mx-auto my-12">Loading...</div>;

// Option 2: Basic Tailwind Spinner
const LoadingSpinner: React.FC = () => (
      <div className="flex justify-center items-center my-12">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
);

export const MemoryCardSkeleton: React.FC = () => (
      <div className="animate-pulse bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
);

export default LoadingSpinner;
