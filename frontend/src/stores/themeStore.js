import { create } from "zustand";

const getInitialTheme = () => {
  const saved = localStorage.getItem("Youtube-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const useThemeStore = create((set) => ({
  theme: getInitialTheme(),

  setTheme: (newTheme) => {
    const root = document.documentElement;
    root.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("Youtube-theme", newTheme);
    set({ theme: newTheme });
  },

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === "dark" ? "light" : "dark";
      const root = document.documentElement;
      root.classList.toggle("dark", newTheme === "dark");
      localStorage.setItem("Youtube-theme", newTheme);
      return { theme: newTheme };
    });
  },
}));
