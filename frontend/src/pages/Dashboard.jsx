import { useEffect, useState } from "react";
import { getChannelStats, getChannelVideos, getTopVideosByTimeframes } from "../api/dashboard.api";
import { useAuthStore } from "../stores/authStore";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { formatViews } from "../utils/format";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [timeframes, setTimeframes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuthStore();
  const userId = user?._id;

  useEffect(() => {
    if (!userId) return;

  const fetchDashboard = async () => {
    try {
      const [statsRes, videosRes, timeframeRes] = await Promise.all([
        getChannelStats(userId),
        getChannelVideos({ page: 1, limit: 10, channelId: userId }),
        getTopVideosByTimeframes(userId),
      ]);

      setStats(statsRes.data.data);
      setVideos(videosRes.data.data.docs || []);
      setTimeframes(timeframeRes?.data?.data || {});
    } catch (err) {
      setError("Failed to load dashboard");
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchDashboard();
}, [userId]);

  if (loading) return <LoadingState label="Loading creator studio..." variant="dashboard" />;
  if (error) return <EmptyState title="Failed to load dashboard" subtitle={error} />;

  const chartSeries = [
    (timeframes?.last7Days || []).reduce((acc, item) => acc + (item.views || 0), 0),
    (timeframes?.last30Days || []).reduce((acc, item) => acc + (item.views || 0), 0),
    (timeframes?.last1Year || []).reduce((acc, item) => acc + (item.views || 0), 0),
  ];

  const chartData = {
    labels: ["Last 7 Days", "Last 30 Days", "Last 1 Year"],
    datasets: [
      {
        label: "Views",
        data: chartSeries,
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14,165,233,0.15)",
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Views Over Time" },
    },
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-100">Creator Studio</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard label="Videos" value={stats.totalVideos} />
          <StatCard label="Views" value={stats.totalViews} />
          <StatCard label="Subscribers" value={stats.totalSubscribers} />
          <StatCard label="Likes" value={stats.totalLikes} />
        </div>
      )}

      <div className="bg-white/90 border rounded-2xl p-4 shadow-sm max-w-3xl border-slate-200 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
        <Line data={chartData} options={chartOptions} />
      </div>

      {stats?.topTwentyVideos?.length > 0 && (
        <div className="bg-white/90 border border-slate-200 rounded-lg p-4 shadow dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
          <h2 className="text-xl font-semibold mb-4 dark:text-slate-100">Top Videos</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thumbnail</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700 dark:text-slate-200">
                {stats.topTwentyVideos.slice(0, 5).map((video) => (
                  <tr key={video._id}>
                    <td className="px-4 py-2">
                      <img src={video.thumbnail} alt={video.title} className="w-24 h-14 object-cover rounded" />
                    </td>
                    <td className="px-4 py-2">{video.title}</td>
                    <td className="px-4 py-2">{formatViews(video.views)}</td>
                    <td className="px-4 py-2">{Math.floor(video.duration)}s</td>
                    <td className="px-4 py-2">{video.isPublished ? "Published" : "Draft"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Videos */}
      {videos.length > 0 && (
        <div className="bg-white/90 border border-slate-200 rounded-lg p-4 shadow dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
          <h2 className="text-xl font-semibold mb-4 dark:text-slate-100">Recent Videos</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-800/70">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thumbnail</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700 dark:text-slate-200">
                {videos.map((video) => (
                  <tr key={video._id}>
                    <td className="px-4 py-2">
                      <img src={video.thumbnail} alt={video.title} className="w-24 h-14 object-cover rounded" />
                    </td>
                    <td className="px-4 py-2">{video.title}</td>
                    <td className="px-4 py-2">{formatViews(video.views)}</td>
                    <td className="px-4 py-2">{Math.floor(video.duration)}s</td>
                    <td className="px-4 py-2">{video.isPublished ? "Published" : "Draft"}</td>
                    <td className="px-4 py-2">
                      <a
                        href={video.videoFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:underline text-xs"
                      >
                        Watch
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value }) {
  return (
    <div className="bg-white/95 border-2 border-red-200 rounded-2xl p-4 shadow-[0_8px_32px_rgba(220,38,38,0.08)] flex flex-col items-center justify-center dark:border-slate-800 dark:bg-black/60 dark:shadow-none">
      <p className="text-gray-500 text-sm dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold dark:text-slate-100">{value}</p>
    </div>
  );
}