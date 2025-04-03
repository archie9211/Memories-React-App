// src/App.tsx
import { Toaster } from "react-hot-toast";
import NavBar from "./components/NavBar";
import TimelinePage from "./pages/TimelinePage";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { useEffect, useState } from "react";
import GlobalMediaGalleryModal from "./components/GlobalMediaGalleryModal"; // Import the new modal

interface AppConfig {
      appTitle: string;
      footerText: string;
}

function App() {
      const [config, setConfig] = useState<AppConfig | null>(null);
      const [isGlobalGalleryOpen, setIsGlobalGalleryOpen] = useState(false);

      useEffect(() => {
            fetch("/api/config")
                  .then((res) => {
                        if (!res.ok) throw new Error("Failed to fetch config");
                        return res.json();
                  })
                  .then((data: AppConfig) => {
                        setConfig(data);
                        // Update document title dynamically
                        document.title = data.appTitle || "Our Memories";
                  })
                  .catch((err) => {
                        console.error("Config fetch error:", err);
                        const fallbackTitle = "Our Memories";
                        setConfig({
                              appTitle: fallbackTitle,
                              footerText: `© ${new Date().getFullYear()}`,
                        });
                        document.title = fallbackTitle;
                  });
      }, []);

      const openGlobalGallery = () => setIsGlobalGalleryOpen(true);
      const closeGlobalGallery = () => setIsGlobalGalleryOpen(false);

      return (
            <ErrorBoundary>
                  <div className="App min-h-screen flex flex-col bg-gray-50">
                        {" "}
                        {/* Added subtle bg */}
                        <Toaster position="top-right" reverseOrder={false} />
                        {/* Pass config title and gallery toggle */}
                        <NavBar
                              title={config?.appTitle}
                              onGalleryClick={openGlobalGallery}
                        />
                        <main className="flex-grow container mx-auto px-4 py-6">
                              {" "}
                              {/* Added container */}
                              <TimelinePage />
                        </main>
                        <footer className="text-center text-xs text-gray-500 py-4 mt-8">
                              {config?.footerText ||
                                    `© ${new Date().getFullYear()}`}
                        </footer>
                        {/* Conditionally render the Global Media Gallery Modal */}
                        {isGlobalGalleryOpen && (
                              <GlobalMediaGalleryModal
                                    onClose={closeGlobalGallery}
                              />
                        )}
                  </div>
            </ErrorBoundary>
      );
}

export default App;
