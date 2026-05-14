import { Link } from "react-router-dom";
import { formatDuration, formatViews } from "../utils/format";

export default function VideoCard({ video, compact = false }) {
  if (!video) return null;

  return (
    <Link
      to={`/watch/${video._id}`}
      className={`group overflow-hidden rounded-xl border-2 border-red-200 bg-white/95 shadow-[0_8px_32px_rgba(220,38,38,0.08)] transition hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(220,38,38,0.12)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none dark:hover:bg-black/70 dark:hover:border-red-700 ${
        compact ? "flex gap-2" : "block"
      }`}
    >
      {/* Thumbnail */}
      <div className={`relative overflow-hidden bg-slate-50 dark:bg-black/50 ${
        compact ? "h-20 w-32 rounded-lg" : "aspect-[16/9] w-full rounded-t-xl"
      }`}>
        <img
          src={video.thumbnail}
          alt={video.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {formatDuration(video.duration)}
        </span>
      </div>

      {/* Content */}
      <div className={`${compact ? "min-w-0 flex-1" : "p-3"}`}>
        <h3 className={`font-semibold leading-tight text-slate-900 dark:text-slate-100 line-clamp-${compact ? "2" : "3"} ${
          compact ? "text-xs" : "text-sm"
        }`}>
          {video.title}
        </h3>
        <p className={`mt-1 text-slate-600 dark:text-slate-400 ${
          compact ? "hidden" : "text-xs"
        }`}>
          {video.owner?.userName || "Creator"}
        </p>
        <p className={`text-slate-500 dark:text-slate-500 ${
          compact ? "text-[10px] mt-0.5" : "text-xs mt-0.5"
        }`}>
          {formatViews(video.views)} views
        </p>
      </div>
    </Link>
  );
}
