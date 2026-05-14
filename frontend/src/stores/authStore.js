import { create } from "zustand";
import { getCurrentUser } from "../api/auth.api";

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  isAuthenticated: false,

  // Initialize user on app load
  initializeAuth: async () => {
    try {
      const res = await getCurrentUser();
      set({
        user: res.data.data,
        isAuthenticated: !!res.data.data,
        loading: false,
      });
    } catch (err) {
      set({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  },

  // Set user
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
    }),
}));
