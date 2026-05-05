import { useEffect, useState } from "react";
import { getWatchHistory } from "../api";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import VideoCard from "../components/VideoCard";

export default function WatchHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getWatchHistory();
        setHistory(res?.data?.data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) return <LoadingState label="Loading watch history..." variant="grid" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Watch History</h1>
      {history.length === 0 ? (
        <EmptyState title="No watch history" subtitle="Start watching videos to build your history." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {history.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
