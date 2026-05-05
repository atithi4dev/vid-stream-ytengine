import { Link } from "react-router-dom";
import { formatDuration, formatViews } from "../utils/format";
import UserAvatar from "./UserAvatar";

export default function VideoCard({ video, compact = false }) {
  if (!video) return null;

  return (
    <Link
      to={`/watch/${video._id}`}
      className={`group overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-[0_6px_24px_rgba(15,23,42,0.04)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none dark:hover:bg-slate-900 ${
        compact ? "flex gap-2.5 p-2.5" : "block"
      }`}
    >
      <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${compact ? "h-20 w-32 rounded-lg sm:h-24 sm:w-40" : "aspect-[16/9] w-full"}`}>
        <img
          src={video.thumbnail}
          alt={video.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {formatDuration(video.duration)}
        </span>
      </div>

      <div className={`${compact ? "min-w-0" : "p-2.5 sm:p-3"}`}>
        <div className="flex gap-2.5">
          {!compact && <UserAvatar src={video.owner?.avatar} name={video.owner?.userName} size="sm" />}
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-800 dark:text-slate-100 sm:text-sm">{video.title}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">{video.owner?.userName || "Creator"}</p>
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 sm:text-xs">{formatViews(video.views)} views</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
