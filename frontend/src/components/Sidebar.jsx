import { NavLink, useLocation } from "react-router-dom";
import {
  FaHome,
  FaHistory,
  FaList,
  FaUpload,
  FaUser,
  FaChartBar,
  FaBroadcastTower,
  FaTrophy,
  FaFire,
  FaEnvelope,
} from "react-icons/fa";

const links = [
  { to: "/", label: "Discover", icon: FaHome },
  { to: "/live", label: "Live", icon: FaBroadcastTower },
  { to: "/dynamic", label: "Dynamic", icon: FaFire },
  { to: "/ranking", label: "Ranking", icon: FaTrophy },
  { to: "/playlists", label: "Playlists", icon: FaList },
  { to: "/upload", label: "Upload", icon: FaUpload },
  { to: "/dashboard", label: "Creator Studio", icon: FaChartBar },
  { to: "/profile", label: "My Profile", icon: FaUser },
  // { to: "/messages", label: "Messages", icon: FaEnvelope, isChat: true }, // Chat feature disabled
  { to: "/channel/me", label: "My Channel", icon: FaUser },
  { to: "/watch-history", label: "History", icon: FaHistory },
];

const mobileLinks = [
  links[0],
  // { to: "/messages", label: "Messages", icon: FaEnvelope, isChat: true }, // Chat feature disabled
  links[1],
  links[5],
  links[6],
];

export default function Sidebar() {
  const location = useLocation();

  // const buildChatHref = () => { // Chat feature disabled
  //   const next = new URLSearchParams(location.search);
  //   next.set("chat", "open");
  //   return `${location.pathname}?${next.toString()}`;
  // }; // Chat feature disabled

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200/70 bg-white/70 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-black/80 lg:block">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-red-600 via-red-500 to-red-700" />
          <div>
            <p className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-white">Youtube</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Premium Media Network</p>
          </div>
        </div>

        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon, isChat }) => (
            <NavLink
              key={to}
              to={to} // Chat feature disabled: isChat ? buildChatHref() : to
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-black/40 dark:hover:text-white"
                }`
              }
            >
              <Icon className="text-base" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-black/95 lg:hidden">
        {mobileLinks.map(({ to, label, icon: Icon, isChat }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[11px] ${
                isActive ? "text-red-700 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
              }`
            }
          >
            <Icon className="text-base" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
