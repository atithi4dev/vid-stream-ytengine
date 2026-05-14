import { useMemo } from "react";
import { useLocation } from "react-router-dom";

const pageMeta = {
  "/live": {
    title: "Live Center",
    description: "Bilibili-style live streaming hub with categories, stream cards, and events.",
  },
  "/dynamic": {
    title: "Dynamic Feed",
    description: "Creator posts, updates, announcements, and community interactions.",
  },
  "/ranking": {
    title: "Ranking Board",
    description: "Regional and category based trending rankings with daily/weekly tabs.",
  },
};

const mockBlocks = [
  "Featured banner carousel",
  "Tabbed timeline (Today / This Week / This Month)",
  "Filter chips (All / Animation / Music / Games / Tech)",
  "Compact cards with badges (HOT / NEW)",
  "Skeleton loading states",
  "Back-to-top floating action",
];

export default function BiliPlaceholder() {
  const location = useLocation();

  const meta = useMemo(() => {
    return pageMeta[location.pathname] || {
      title: "Bili Feature",
      description: "Frontend-only Bilibili-inspired module.",
    };
  }, [location.pathname]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-2 border-red-200 bg-white/95 p-5 shadow-[0_8px_32px_rgba(220,38,38,0.08)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{meta.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meta.description}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {mockBlocks.map((block) => (
          <div key={block} className="rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{block}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">UI implemented as backend-agnostic placeholder.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
