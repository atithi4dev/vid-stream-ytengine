import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { getPublishedVideos } from "../api/video.api";
import VideoCard from "../components/VideoCard";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import ChatPanel from "../components/ChatPanel";

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
  const loadMoreRef = useRef(null);
  const query = searchParams.get("q") || "";
  const activeTag = searchParams.get("tag") || "For You";
  const isChatOpen = searchParams.get("chat") === "open";

  const handleToggleChat = () => {
    const next = new URLSearchParams(searchParams);
    if (isChatOpen) {
      next.delete("chat");
    } else {
      next.set("chat", "open");
    }
    setSearchParams(next, { replace: true });
  };

  const fetchVideos = async ({ page = 1, append = false, silent = false } = {}) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else if (!silent) {
        setLoading(true);
      }

      setError("");
      const effectiveQuery = query || (activeTag !== "For You" ? activeTag : "");
      const res = await getPublishedVideos({
        page,
        limit: 12,
        query: effectiveQuery,
      });
      const payload = res?.data?.data || {};
      const docs = payload.docs || [];

      setVideos((prev) => (append ? [...prev, ...docs] : docs));
      setPageInfo({ page: payload.page || page, hasNextPage: payload.hasNextPage || false });
    } catch {
      setError("Failed to load videos.");
    } finally {
      setLoadingMore(false);
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
    if (!target || loading || loadingMore || !pageInfo.hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && pageInfo.hasNextPage && !loadingMore) {
          fetchVideos({ page: pageInfo.page + 1, append: true });
        }
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [pageInfo, loading, loadingMore, query, activeTag]);

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
    <div className={`gap-4 ${isChatOpen ? "lg:grid lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_500px]" : ""}`}>
      <div className="space-y-6 min-w-0">
      <div className="hidden lg:block rounded-2xl bg-gradient-to-r from-sky-600 to-blue-500 px-4 py-7 text-white shadow-[0_16px_40px_rgba(2,132,199,0.28)] sm:px-6 sm:py-8">
        <h1 className="text-xl font-bold sm:text-2xl">Discover trending creators and stories</h1>
        <p className="mt-1 text-sm text-sky-100">A modern Bili-style feed powered by your backend APIs.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-white/20 p-3 text-xs">Top Picks</div>
          <div className="rounded-xl bg-white/20 p-3 text-xs">New Episodes</div>
          <div className="rounded-xl bg-white/20 p-3 text-xs">Weekly Rankings</div>
        </div>
      </div>

      <section className="hidden lg:grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {quickModules.map((item) => (
          <div key={item.title} className="rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/75 dark:shadow-none">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleToggleChat}
          className={`rounded-full border px-4 py-1.5 text-sm transition ${
            isChatOpen
              ? "border-sky-400 bg-sky-500 text-white"
              : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          }`}
        >
          {isChatOpen ? "Close Chat" : "Open Chat"}
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set("tag", tag);
              setSearchParams(next, { replace: true });
            }}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              activeTag === tag ? "bg-slate-900 text-white dark:bg-sky-500" : "bg-white text-slate-600 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
    </div>
  );
}
