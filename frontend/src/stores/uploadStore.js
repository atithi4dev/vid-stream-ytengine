import { create } from "zustand";

const STORAGE_KEY = "uploadStore";

// In-memory storage for non-serializable data (like File objects)
const inMemoryData = new Map();

// Helper to save to localStorage
const saveToStorage = (state) => {
  try {
    // Only save serializable data (not File objects)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      uploadQueue: state.uploadQueue.map(v => ({
        videoId: v.videoId,
        title: v.title,
        filename: v.filename,
        status: v.status,
        createdAt: v.createdAt,
        thumbnailDataUrl: v.thumbnailDataUrl, // Persisted thumbnail as data URL
      })),
      uploadProgress: state.uploadProgress,
    }));
  } catch (error) {
    console.error("Failed to save upload state:", error);
  }
};

// Helper to load from localStorage
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load upload state:", error);
  }
  return { uploadQueue: [], uploadProgress: {} };
};

export const useUploadStore = create((set) => {
  const initialState = loadFromStorage();

  return {
    // Queue of videos being uploaded
    uploadQueue: initialState.uploadQueue,
    // Map of videoId -> progress (0-100)
    uploadProgress: initialState.uploadProgress,

    // Add video to upload queue
    addToQueue: (videoId, videoData) => {
      set((state) => {
        console.log(`📦 addToQueue called with videoId: ${videoId}, title: ${videoData.title}`);
        const exists = state.uploadQueue.some((v) => v.videoId === videoId);
        if (exists) {
          console.warn(`⚠️ Video ${videoId} already in queue`);
          return state;
        }

        let thumbnailDataUrl = null;

        // Convert thumbnail File to data URL for persistence
        if (videoData.thumbnail) {
          const reader = new FileReader();
          reader.onload = (e) => {
            thumbnailDataUrl = e.target.result;
            // Store in state after reader completes
            useUploadStore.setState((state) => {
              const updatedQueue = state.uploadQueue.map((v) =>
                v.videoId === videoId ? { ...v, thumbnailDataUrl } : v
              );
              saveToStorage({ ...state, uploadQueue: updatedQueue });
              return { uploadQueue: updatedQueue };
            });
          };
          reader.readAsDataURL(videoData.thumbnail);
          console.log(`✅ Started reading thumbnail for ${videoId}`);
        }

        const videoItem = {
          videoId,
          title: videoData.title,
          filename: videoData.filename,
          status: "uploading", // uploading, processing, completed, failed
          createdAt: new Date(),
          thumbnailDataUrl: null, // Will be updated when reader completes
        };

        const newState = {
          uploadQueue: [
            ...state.uploadQueue,
            videoItem,
          ],
          uploadProgress: {
            ...state.uploadProgress,
            [videoId]: 0,
          },
        };
        console.log(`✅ Queue updated. Total items: ${newState.uploadQueue.length}`);
        saveToStorage(newState);
        return newState;
      });
    },

    // Get in-memory data (like File objects)
    getInMemoryData: (videoId) => {
      return inMemoryData.get(videoId);
    },

    // Update upload progress
    updateProgress: (videoId, progress) => {
      set((state) => {
        const newState = {
          uploadProgress: {
            ...state.uploadProgress,
            [videoId]: Math.min(progress, 100),
          },
        };
        saveToStorage({ ...state, ...newState });
        return newState;
      });
    },

    // Update video status
    updateStatus: (videoId, status) => {
      set((state) => {
        const newState = {
          uploadQueue: state.uploadQueue.map((v) =>
            v.videoId === videoId ? { ...v, status } : v
          ),
        };
        saveToStorage({ ...state, ...newState });
        return newState;
      });
    },

    // Remove from queue
    removeFromQueue: (videoId) => {
      set((state) => {
        const newState = {
          uploadQueue: state.uploadQueue.filter((v) => v.videoId !== videoId),
          uploadProgress: Object.fromEntries(
            Object.entries(state.uploadProgress).filter(([id]) => id !== videoId)
          ),
        };
        // Clean up in-memory data
        inMemoryData.delete(videoId);
        saveToStorage(newState);
        return newState;
      });
    },

    // Clear completed uploads
    clearCompleted: () => {
      set((state) => {
        const newState = {
          uploadQueue: state.uploadQueue.filter((v) => v.status !== "completed"),
        };
        saveToStorage(newState);
        return newState;
      });
    },

    // Clear all uploads
    clearAll: () => {
      set({
        uploadQueue: [],
        uploadProgress: {},
      });
      // Clear in-memory data
      inMemoryData.clear();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error("Failed to clear storage:", error);
      }
    },
  };
});
