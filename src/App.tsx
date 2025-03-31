import { Toaster } from "react-hot-toast";
import NavBar from "./components/NavBar";
import TimelinePage from "./pages/TimelinePage";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";
import { useEffect, useState } from "react";

interface AppConfig {
      appTitle: string;
      footerText: string;
}

function App() {
      const [config, setConfig] = useState<AppConfig | null>(null);

      useEffect(() => {
            fetch("/api/config")
                  .then((res) => {
                        if (!res.ok) throw new Error("Failed to fetch config");
                        return res.json();
                  })
                  .then((data) => setConfig(data))
                  .catch((err) => {
                        console.error("Config fetch error:", err);
                        setConfig({
                              appTitle: "Memory Timeline",
                              footerText: `© ${new Date().getFullYear()}`,
                        });
                  });
      }, []);

      return (
            <ErrorBoundary>
                  <div className="App min-h-screen flex flex-col">
                        <Toaster position="top-right" reverseOrder={false} />
                        <NavBar />
                        <main className="flex-grow">
                              <TimelinePage />
                        </main>
                        <footer className="text-center text-xs text-gray-400 py-4 mt-8">
                              {config?.footerText ||
                                    `© ${new Date().getFullYear()}`}
                        </footer>
                  </div>
            </ErrorBoundary>
      );
}

export default App;
