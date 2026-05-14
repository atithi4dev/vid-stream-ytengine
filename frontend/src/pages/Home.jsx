import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { getPublishedVideos } from "../api/video.api";
import VideoCard from "../components/VideoCard";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
// import ChatPanel from "../components/ChatPanel"; // Chat feature disabled
import { useUIStore } from "../stores/uiStore";

const tags = ["For You", "Animation", "Music", "Gaming", "Tech", "Lifestyle", "Live", "Bangumi", "Dance"];
const quickModules = [
  { title: "Popular", subtitle: "Daily trending board" },
  { title: "Live Streams", subtitle: "Creators now online" },
  { title: "Bangumi", subtitle: "Anime & serialized shows" },
  { title: "Dynamic Feed", subtitle: "Creator posts & updates" },
  { title: "Watch Later", subtitle: "Queue your next videos" },
  { title: "Music Zone", subtitle: "Songs, covers, MV" },
];

export default function Home() {
  const location = useLocation();
  const [videos, setVideos] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, hasNextPage: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const { setIsLoadingMore } = useUIStore();
  const loadMoreRef = useRef(null);
  const query = searchParams.get("q") || "";
  const activeTag = searchParams.get("tag") || "For You";

  const fetchVideos = async ({ page = 1, append = false, silent = false } = {}) => {
    try {
      if (append) {
        setLoadingMore(true);
        setIsLoadingMore(true);
      } else if (!silent) {
        setLoading(true);
      }

      setError("");
      const effectiveQuery = query || (activeTag !== "For You" ? activeTag : "");
      const params = {
        page,
        limit: 12,
      };
      if (effectiveQuery) {
        params.query = effectiveQuery;
      }
      const res = await getPublishedVideos(params);
      const payload = res?.data?.data || {};
      
      // Handle both response structures: direct array or object with docs property
      const docs = Array.isArray(payload) ? payload : (payload.docs || []);
      
      // Determine if there are more pages
      let hasNextPage = false;
      if (Array.isArray(payload)) {
        hasNextPage = docs.length >= 12;
      } else {
        hasNextPage = payload.hasNextPage || false;
      }
      
      // If append request returns 0 results, definitely no more pages
      if (append && docs.length === 0) {
        hasNextPage = false;
      }
      
      const pageInfo = { page, hasNextPage };

      setVideos((prev) => (append ? [...prev, ...docs] : docs));
      setPageInfo(pageInfo);
      
      // Only show error message on initial load with no results
      if (!append && docs.length === 0) {
        setError(query ? `No result for "${query}". Try another search term.` : "No published videos available yet.");
      }
    } catch (err) {
      // Only show error on initial load, silently fail on pagination
      if (!append) {
        setError("Failed to load videos.");
      } else {
        // On pagination error, stop trying to load more pages
        setPageInfo((prev) => ({ ...prev, hasNextPage: false }));
      }
    } finally {
      setLoadingMore(false);
      setIsLoadingMore(false);
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchVideos({ page: 1, append: false });
  }, [query, activeTag]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || loading || !pageInfo.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Only fetch if intersecting AND not already loading AND has more pages
        if (entry.isIntersecting && pageInfo.hasNextPage && !loadingMore) {
          fetchVideos({ page: pageInfo.page + 1, append: true });
        }
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [pageInfo.hasNextPage, loading, loadingMore, query, activeTag]);

  useEffect(() => {
    const onPullRefresh = async (event) => {
      const targetPath = event?.detail?.path;
      if (targetPath !== location.pathname) return;

      await fetchVideos({ page: 1, append: false, silent: true });
      event?.detail?.complete?.();
    };

    window.addEventListener("app:pull-refresh", onPullRefresh);
    return () => window.removeEventListener("app:pull-refresh", onPullRefresh);
  }, [location.pathname, query, activeTag]);

  if (loading) return <LoadingState label="Loading discover feed..." variant="grid" />;
  if (error) return <EmptyState title="Unable to fetch videos" subtitle={error} />;

  return (
    <div>
      <div className="space-y-6 min-w-0">
      <div className="hidden lg:block rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-7 text-white shadow-[0_16px_40px_rgba(220,38,38,0.28)] sm:px-6 sm:py-8 border border-red-400/50">
        <h1 className="text-xl font-bold sm:text-2xl">Discover trending creators and stories</h1>
        <p className="mt-1 text-sm text-red-100">A modern Bili-style feed powered by your backend APIs.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-white/20 border border-white/30 p-3 text-xs font-medium">Top Picks</div>
          <div className="rounded-xl bg-white/20 border border-white/30 p-3 text-xs font-medium">New Episodes</div>
          <div className="rounded-xl bg-white/20 border border-white/30 p-3 text-xs font-medium">Weekly Rankings</div>
        </div>
      </div>

      <section className="hidden lg:grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {quickModules.map((item) => (
          <div key={item.title} className="rounded-xl border-2 border-red-200 bg-white/95 p-4 shadow-[0_8px_24px_rgba(220,38,38,0.06)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none hover:border-red-300 dark:hover:border-red-700 transition">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{item.title}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{item.subtitle}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        {/* Chat feature disabled
        <button
          onClick={handleToggleChat}
          className={`rounded-full border px-4 py-1.5 text-sm transition ${
            isChatOpen
              ? "border-red-500 bg-red-600 text-white"
              : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          }`}
        >
          {isChatOpen ? "Close Chat" : "Open Chat"}
        </button>
        */}
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("tag", tag);
              setSearchParams(next, { replace: true });
            }}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              activeTag === tag ? "bg-slate-900 text-white dark:bg-red-600" : "bg-white text-slate-600 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {videos.length === 0 ? (
        <EmptyState
          title="No videos found"
          subtitle={query ? `No result for “${query}”. Try another search term.` : "No published videos available yet."}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>

          <div ref={loadMoreRef} className="flex min-h-12 items-center justify-center py-2 text-sm text-slate-500 dark:text-slate-400">
            {loadingMore ? "Loading more videos..." : pageInfo.hasNextPage ? "Scroll for more" : "You reached the end"}
          </div>
        </>
      )}
      </div>

      {/* Chat feature disabled
      {isChatOpen && (
        <aside className="hidden lg:block">
          <div className="sticky top-20 h-[calc(100vh-110px)]">
            <ChatPanel
              className="h-full"
              onClose={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("chat");
                setSearchParams(next, { replace: true });
              }}
            />
          </div>
        </aside>
      )}

      {isChatOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-16 top-16 z-30 p-3 bg-slate-900/25 backdrop-blur-sm">
          <div className="h-full rounded-2xl">
            <ChatPanel
              className="h-full"
              onClose={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("chat");
                setSearchParams(next, { replace: true });
              }}
            />
          </div>
        </div>
      )}
      */}
    </div>
  );
}
