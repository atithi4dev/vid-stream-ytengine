import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FaSearch, FaSignOutAlt, FaBell, FaEnvelope, FaUpload, FaMoon, FaSun } from "react-icons/fa";
import { logoutUser } from "../api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import UserAvatar from "./UserAvatar";

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

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

  const chatHref = (() => {
    const next = new URLSearchParams(location.search);
    next.set("chat", "open");
    return `${location.pathname}?${next.toString()}`;
  })();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/65">
      <div className="mx-auto flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
        <Link to="/" className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white lg:hidden">Billo</Link>

        <form onSubmit={handleSearch} className="flex max-w-2xl flex-1 items-center">
          <div className="flex w-full items-center rounded-full border border-slate-300 bg-slate-50/80 px-4 dark:border-slate-700 dark:bg-slate-900/70">
            <FaSearch className="text-slate-400 dark:text-slate-500" />
            <input
              name="query"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder="Search videos, creators, playlists"
              className="h-10 w-full bg-transparent px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500 sm:h-11"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-full border border-slate-300 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <FaSun /> : <FaMoon />}
          </button>
          <Link to="/upload" className="hidden rounded-full border border-slate-300 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:block" aria-label="Upload">
            <FaUpload />
          </Link>
          <Link to="/dynamic" className="hidden rounded-full border border-slate-300 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 md:block" aria-label="Notifications">
            <FaBell />
          </Link>
          <Link to={chatHref} className="hidden rounded-full border border-slate-300 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 md:block" aria-label="Messages">
            <FaEnvelope />
          </Link>
          <Link to="/profile" className="hidden text-sm font-medium text-slate-600 dark:text-slate-300 md:block">
            {user?.fullName || "My Profile"}
          </Link>
          <UserAvatar src={user?.avatar} name={user?.fullName || user?.userName} size="sm" />
          <button
            onClick={handleLogout}
            className="rounded-full border border-slate-300 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Logout"
          >
            <FaSignOutAlt />
          </button>
        </div>
      </div>
    </header>
  );
}
