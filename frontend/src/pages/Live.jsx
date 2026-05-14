import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getPublishedVideos } from "../api/video.api";
import { formatDate, formatViews } from "../utils/format";

const timelineTabs = [
  { key: "today", label: "Today", days: 1 },
  { key: "week", label: "This Week", days: 7 },
  { key: "month", label: "This Month", days: 30 },
];

const filterChips = ["All", "Animation", "Music", "Games", "Tech"];

function inferCategory(video, index) {
  const text = `${video?.title || ""} ${video?.description || ""}`.toLowerCase();

  if (/(anime|animation|cartoon|draw|manga)/.test(text)) return "Animation";
  if (/(music|song|cover|dance|mv|beat)/.test(text)) return "Music";
  if (/(game|gaming|fps|rpg|esports|play)/.test(text)) return "Games";
  if (/(tech|code|ai|program|dev|review|gadget)/.test(text)) return "Tech";

  const fallback = ["Animation", "Music", "Games", "Tech"];
  return fallback[index % fallback.length];
}

function hashValue(seed = "") {
  return String(seed)
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function toLiveStream(video, index, maxViews) {
  const hash = hashValue(video?._id || `${index}`);
  const now = Date.now();
  const createdAt = new Date(video?.createdAt || now);
  const ageDays = Math.max(0, (now - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const category = inferCategory(video, index);

  const liveNow = hash % 3 !== 0;
  const baseViewers = Math.max(60, Math.floor((video?.views || 0) / 9) + (hash % 420));

  return {
    ...video,
    category,
    liveNow,
    baseViewers,
    isNew: ageDays <= 3,
    isHot: (video?.views || 0) >= Math.max(1500, Math.floor(maxViews * 0.45)),
    startsInMinutes: (hash % 180) + 8,
  };
}

function LiveCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border-2 border-red-200 bg-white/90 p-2.5 shadow-[0_8px_24px_rgba(220,38,38,0.06)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none">
      <div className="h-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="mt-2 h-3 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-2 h-3 w-2/5 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mt-2 h-3 w-3/5 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export default function Live() {
  const location = useLocation();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeline, setTimeline] = useState("today");
  const [chip, setChip] = useState("All");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [viewerDelta, setViewerDelta] = useState({});
  const [showTop, setShowTop] = useState(false);

  const timelineDays = useMemo(
    () => timelineTabs.find((item) => item.key === timeline)?.days || 1,
    [timeline]
  );

  const fetchLiveData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getPublishedVideos({ page: 1, limit: 28, sortBy: "createdAt", sortType: "desc" });
      const responseData = response?.data?.data || [];
      const docs = Array.isArray(responseData) ? responseData : (responseData.docs || []);
      const maxViews = docs.reduce((max, item) => Math.max(max, Number(item?.views || 0)), 0);
      setStreams(docs.map((video, index) => toLiveStream(video, index, maxViews)));
    } catch {
      setError("Failed to load live data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  useEffect(() => {
    const onPullRefresh = async (event) => {
      const targetPath = event?.detail?.path;
      if (targetPath !== location.pathname) return;

      await fetchLiveData();
      event?.detail?.complete?.();
    };

    window.addEventListener("app:pull-refresh", onPullRefresh);
    return () => window.removeEventListener("app:pull-refresh", onPullRefresh);
  }, [location.pathname]);

  useEffect(() => {
    if (streams.length === 0) return;

    const id = window.setInterval(() => {
      setViewerDelta((prev) => {
        const next = { ...prev };

        streams.forEach((stream) => {
          if (!stream.liveNow) return;
          const jump = Math.floor(Math.random() * 14) + 2;
          next[stream._id] = Math.min((next[stream._id] || 0) + jump, 3000);
        });

        return next;
      });
    }, 3200);

    return () => window.clearInterval(id);
  }, [streams]);

  const timelineStreams = useMemo(() => {
    const now = Date.now();
    return streams.filter((stream) => {
      const createdAt = new Date(stream.createdAt).getTime();
      const ageDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      return ageDays <= timelineDays;
    });
  }, [streams, timelineDays]);

  const filteredStreams = useMemo(() => {
    if (chip === "All") return timelineStreams;
    return timelineStreams.filter((stream) => stream.category === chip);
  }, [timelineStreams, chip]);

  const featuredStreams = useMemo(() => {
    const list = filteredStreams.length > 0 ? filteredStreams : timelineStreams;
    return list.slice(0, 5);
  }, [filteredStreams, timelineStreams]);

  useEffect(() => {
    if (featuredStreams.length <= 1) return;

    const id = window.setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % featuredStreams.length);
    }, 4200);

    return () => window.clearInterval(id);
  }, [featuredStreams.length]);

  useEffect(() => {
    setCarouselIndex(0);
  }, [timeline, chip]);

  useEffect(() => {
    const container = document.querySelector("main");
    if (!container) return;

    const onScroll = () => {
      setShowTop(container.scrollTop > 320);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const activeFeatured = featuredStreams[carouselIndex] || null;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border-2 border-red-200 bg-white/95 p-4 shadow-[0_8px_32px_rgba(220,38,38,0.08)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Live Center</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bilibili-style live streaming hub with categories, stream cards, and events.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border-2 border-red-200 bg-white/95 dark:border-slate-800 dark:bg-black/60">
        {loading ? (
          <div className="animate-pulse p-4">
            <div className="h-44 rounded-xl bg-slate-200 dark:bg-slate-800 sm:h-56" />
          </div>
        ) : activeFeatured ? (
          <div className="relative h-44 sm:h-56">
            <img src={activeFeatured.thumbnail} alt={activeFeatured.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-white/20 px-2 py-1">{activeFeatured.category}</span>
                <span className="rounded-full bg-black/40 px-2 py-1">{formatViews(activeFeatured.views)} views</span>
                {activeFeatured.liveNow && <span className="animate-pulse rounded-full bg-rose-500 px-2 py-1 font-semibold">LIVE</span>}
              </div>

              <Link to={`/live/${activeFeatured._id}`} className="line-clamp-2 text-lg font-bold hover:underline">
                {activeFeatured.title}
              </Link>
            </div>

            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {featuredStreams.map((item, index) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => setCarouselIndex(index)}
                  className={`h-2.5 w-2.5 rounded-full ${index === carouselIndex ? "bg-white" : "bg-white/45"}`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">No featured stream available.</p>
        )}
      </section>

      <section className="flex flex-wrap gap-2">
        {timelineTabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTimeline(item.key)}
            className={`rounded-full border px-3 py-1.5 text-sm ${timeline === item.key ? "border-red-500 bg-red-500 text-white" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
          >
            {item.label}
          </button>
        ))}
      </section>

      <section className="flex flex-wrap gap-2">
        {filterChips.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setChip(item)}
            className={`rounded-full border px-3 py-1.5 text-sm ${chip === item ? "border-slate-900 bg-slate-900 text-white dark:border-red-500 dark:bg-red-500" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
          >
            {item}
          </button>
        ))}
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-700/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <section className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 10 }).map((_, idx) => (
            <LiveCardSkeleton key={`live-skeleton-${idx}`} />
          ))}
        </section>
      ) : filteredStreams.length === 0 ? (
        <div className="rounded-xl border-2 border-red-200 bg-white/95 px-4 py-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-black/60 dark:text-slate-400">
          No streams available for this filter.
        </div>
      ) : (
        <section className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStreams.map((stream) => {
            const viewerCount = stream.baseViewers + (viewerDelta[stream._id] || 0);

            return (
              <article key={stream._id} className="group overflow-hidden rounded-xl border-2 border-red-200 bg-white/95 shadow-[0_8px_32px_rgba(220,38,38,0.08)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(220,38,38,0.12)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none dark:hover:bg-black/70 dark:hover:border-red-700">
                <Link to={`/live/${stream._id}`} className="relative block overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img src={stream.thumbnail} alt={stream.title} className="h-36 w-full object-cover transition duration-300 group-hover:scale-[1.02]" />

                  <div className="absolute left-2 top-2 flex gap-1">
                    {stream.isHot && <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">HOT</span>}
                    {stream.isNew && <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">NEW</span>}
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px]">
                    <span className={`rounded px-1.5 py-0.5 font-semibold text-white ${stream.liveNow ? "bg-rose-500 animate-pulse" : "bg-slate-700/80"}`}>
                      {stream.liveNow ? "LIVE" : `Starts in ${stream.startsInMinutes}m`}
                    </span>
                    <span className="rounded bg-black/55 px-1.5 py-0.5 text-white">{formatViews(viewerCount)} watching</span>
                  </div>
                </Link>

                <div className="space-y-1 p-2.5">
                  <Link to={`/live/${stream._id}`} className="block truncate text-sm font-semibold text-slate-800 hover:text-red-600 dark:text-slate-100 dark:hover:text-red-400">
                    {stream.title}
                  </Link>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{stream.owner?.userName || "Unknown creator"}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{stream.category}</span>
                    <span>{formatDate(stream.createdAt)}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {showTop && (
        <button
          type="button"
          onClick={() => {
            const container = document.querySelector("main");
            if (container) {
              container.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="fixed bottom-20 right-4 z-30 rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-red-700 lg:bottom-6"
        >
          Back to top
        </button>
      )}
    </div>
  );
}
