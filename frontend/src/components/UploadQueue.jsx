import { useEffect } from "react";
import { useUploadStore } from "../stores/uploadStore";
import { subscribeWithRetry, unsubscribeFromVideo } from "../services/websocket";

export default function UploadQueue() {
  const { uploadQueue, uploadProgress, clearAll } = useUploadStore();

  // Subscribe to videos when they're added to queue or on refresh
  useEffect(() => {
    console.log("🔄 UploadQueue effect triggered, uploadQueue:", uploadQueue);
    
    uploadQueue.forEach((video) => {
      console.log(`📍 Processing video in queue: ${video.videoId}, title: ${video.title}`);
      subscribeWithRetry(video.videoId);
    });

    return () => {
      uploadQueue.forEach((video) => {
        unsubscribeFromVideo(video.videoId);
      });
    };
  }, [uploadQueue]);

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Upload Progress
        </h3>
        {uploadQueue.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
          >
            Clear All
          </button>
        )}
      </div>
      
      {uploadQueue.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No uploads in progress. Start uploading to see progress here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {uploadQueue.map((video) => {
            const progress = uploadProgress[video.videoId] || 0;

            return (
              <div
                key={video.videoId}
                className="rounded-lg border border-slate-200 bg-white overflow-hidden dark:border-slate-700 dark:bg-slate-900 shadow-sm hover:shadow-md transition"
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-video bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  {video.thumbnailDataUrl ? (
                    <img
                      src={video.thumbnailDataUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Progress bar overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-300 dark:bg-slate-700">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${Math.round(progress)}%` }}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 space-y-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                      {video.title}
                    </h4>
                  </div>
                  
                  {/* Progress percentage */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Progress
                    </span>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
