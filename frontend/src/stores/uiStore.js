import { create } from "zustand";

export const useUIStore = create((set) => {
  // Initialize loading progress simulation
  const startProgressSimulation = () => {
    set({ isLoadingMore: true, loadingProgress: 10 });
    const interval = setInterval(() => {
      set((state) => {
        if (state.loadingProgress >= 90) return state;
        return {
          loadingProgress: state.loadingProgress + Math.random() * 10 + 5,
        };
      });
    }, 150);
    return interval;
  };

  return {
    isLoadingMore: false,
    loadingProgress: 0,

    setIsLoadingMore: (isLoadingMore) => {
      if (isLoadingMore) {
        const interval = startProgressSimulation();
        set((state) => ({
          ...state,
          isLoadingMore,
          _progressInterval: interval,
        }));
      } else {
        set((state) => {
          clearInterval(state._progressInterval);
          return {
            isLoadingMore: false,
            loadingProgress: 0,
            _progressInterval: undefined,
          };
        });
      }
    },

    setLoadingProgress: (progress) => set({ loadingProgress: progress }),

    _progressInterval: undefined,
  };
});
