import React from "react";

class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean }
> {
      state = { hasError: false };

      static getDerivedStateFromError() {
            return { hasError: true };
      }

      render() {
            if (this.state.hasError) {
                  return (
                        <div className="text-center p-4 text-red-600">
                              Something went wrong. Please try again.
                        </div>
                  );
            }
            return this.props.children;
      }
}

export default ErrorBoundary;
