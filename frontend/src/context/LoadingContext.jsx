import { createContext, useContext, useState, useEffect } from "react";

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!isLoadingMore) {
      setLoadingProgress(0);
      return;
    }

    // Simulate progress: start at 10% and gradually increase to 90%
    setLoadingProgress(10);
    
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) return prev;
        // Increase by random amount between 5-15% with decreasing speed
        return prev + Math.random() * 10 + 5;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isLoadingMore]);

  return (
    <LoadingContext.Provider value={{ isLoadingMore, setIsLoadingMore, loadingProgress, setLoadingProgress }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoadingState() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoadingState must be used within LoadingProvider");
  }
  return context;
}
