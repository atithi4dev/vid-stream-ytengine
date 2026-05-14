import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FaSearch, FaSignOutAlt, FaBell, FaUpload, FaMoon, FaSun } from "react-icons/fa";
// import { FaEnvelope } from "react-icons/fa"; // Chat feature disabled
import { logoutUser } from "../api";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";
import { useUIStore } from "../stores/uiStore";
import UserAvatar from "./UserAvatar";
import { useEffect, useState } from "react";

export default function Topbar() {
  const { isLoadingMore, loadingProgress, setLoadingProgress } = useUIStore();
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (isLoadingMore) {
      setIsCompleting(false);
      setDisplayProgress(loadingProgress);
    } else if (displayProgress > 0) {
      // When loading completes, jump to 100%
      setDisplayProgress(100);
      setIsCompleting(true);
      // Hide the bar after animation completes
      const timer = setTimeout(() => {
        setDisplayProgress(0);
        setIsCompleting(false);
        setLoadingProgress(0);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isLoadingMore, loadingProgress, setLoadingProgress]);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const handleSearch = (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("query")?.toString().trim();
    navigate(query ? `/?q=${encodeURIComponent(query)}` : "/");
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    navigate("/login");
  };

  // const chatHref = (() => {
  //   const next = new URLSearchParams(location.search);
  //   next.set("chat", "open");
  //   return `${location.pathname}?${next.toString()}`;
  // })();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-300 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-black/80">
      {(displayProgress > 0 || isLoadingMore) && (
        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-slate-200 dark:bg-black/40">
          <div
            className="h-full bg-red-600"
            style={{
              width: `${displayProgress}%`,
              transition: "width 0.15s ease-out",
              boxShadow: "0 0 12px rgba(220, 38, 38, 0.8)",
            }}
          />
          <style>{`
            @keyframes progress-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}</style>
        </div>
      )}
      <div className="mx-auto flex h-20 items-center justify-between gap-4 px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-1 shrink-0 min-w-fit">
          <img src="/logo.png" alt="Amplify" className="h-12 w-10 object-contain" />
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">Amplify</span>
        </Link>

        <form onSubmit={handleSearch} className="flex max-w-2xl flex-1 items-center">
          <div className="flex w-full items-center rounded-full border-2 border-slate-400 bg-slate-100 px-5 dark:border-slate-800 dark:bg-black/50">
            <FaSearch className="text-lg text-slate-600 dark:text-slate-300" />
            <input
              name="query"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder="Search videos, creators, playlists"
              className="h-12 w-full bg-transparent px-4 text-base text-slate-800 outline-none placeholder:text-slate-500 dark:text-slate-200 dark:placeholder:text-slate-500 sm:h-14"
            />
          </div>
        </form>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleTheme}
            className="rounded-full border-2 border-slate-400 p-3 text-lg text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-black/40"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <FaSun /> : <FaMoon />}
          </button>
          <Link to="/upload" className="hidden rounded-full border-2 border-slate-400 p-3 text-lg text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-black/40 sm:block" aria-label="Upload">
            <FaUpload />
          </Link>
          <Link to="/dynamic" className="hidden rounded-full border-2 border-slate-400 p-3 text-lg text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-black/40 md:block" aria-label="Notifications">
            <FaBell />
          </Link>
          {/* <Link to={chatHref} className="hidden rounded-full border border-slate-300 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-black/40 md:block" aria-label="Messages">
            <FaEnvelope />
          </Link> */}
          <Link to="/profile" className="hidden text-base font-medium text-slate-700 dark:text-slate-200 md:block">
            {user?.fullName || "My Profile"}
          </Link>
          <UserAvatar src={user?.avatar} name={user?.fullName || user?.userName} size="md" />
          <button
            onClick={handleLogout}
            className="rounded-full border-2 border-slate-400 p-3 text-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-black/40 dark:hover:text-white"
            aria-label="Logout"
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>
    </header>
  );
}
