import { useEffect, useRef, useState, useCallback } from "react";
import HLS from "hls.js";
import {
  FaPlay,
  FaPause,
  FaVolumeMute,
  FaVolumeUp,
  FaExpand,
  FaCog,
  FaClosedCaptioning,
} from "react-icons/fa";
import "../styles/VideoPlayer.css";

const VideoPlayer = ({ video, onTimeUpdate = () => {}, className = "" }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [quality, setQuality] = useState("auto");
  const [availableQualities, setAvailableQualities] = useState([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [videoOpacity, setVideoOpacity] = useState(100);

  // Get video source and fallback logic
  const getVideoSource = useCallback(() => {
    if (!video) return null;

    // Priority: HLS masterUrl > 1080p > 720p > 360p > fallback videoFile
    if (video.hls?.masterUrl) {
      return {
        url: video.hls.masterUrl,
        type: "application/x-mpegURL",
        isHLS: true,
      };
    }

    // Fallback to MP4 quality priority
    const qualityPriority = ["1080p", "720p", "360p"];
    for (const q of qualityPriority) {
      const videoUrl = video.hls?.resolutions?.[q]?.videoUrl;
      if (videoUrl) {
        return {
          url: videoUrl,
          type: "video/mp4",
          isHLS: false,
          quality: q,
        };
      }
    }

    // Last resort: direct videoFile
    if (video.videoFile) {
      return {
        url: video.videoFile,
        type: "video/mp4",
        isHLS: false,
      };
    }

    return null;
  }, [video]);

  // Initialize HLS
  useEffect(() => {
    const source = getVideoSource();
    if (!source || !videoRef.current) return;

    if (source.isHLS && HLS.isSupported()) {
      // Destroy existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new HLS({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
      });

      hlsRef.current = hls;

      // Load the master playlist
      hls.loadSource(source.url);
      hls.attachMedia(videoRef.current);

      // Extract available qualities
      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels;
        const qualities = levels.map((level) => ({
          id: level.height ? `${level.height}p` : "auto",
          height: level.height,
          bitrate: level.bitrate,
        }));

        // Add "Auto" quality
        setAvailableQualities([{ id: "auto", height: 0, bitrate: 0 }, ...qualities]);
        setQuality("auto");

        // Enable level switching
        hls.currentLevel = -1; // -1 = auto
      });

      // Handle quality switching
      hls.on(HLS.Events.LEVEL_SWITCHING, (data) => {
        console.log(`📺 Switched to quality: ${data.level}`);
      });

      // Handle errors
      hls.on(HLS.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error("❌ Fatal HLS error:", data);
          switch (data.type) {
            case HLS.ErrorTypes.NETWORK_ERROR:
              console.error("Network error - retrying...");
              hls.startLoad();
              break;
            case HLS.ErrorTypes.MEDIA_ERROR:
              console.error("Media error - trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              // Cannot recover
              hls.destroy();
              hlsRef.current = null;
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (source.url && !HLS.isSupported()) {
      // Native HLS support (Safari) or fallback MP4
      videoRef.current.src = source.url;
    }
  }, [getVideoSource, video?._id]);

  // Handle quality switching
  const handleQualityChange = useCallback((qualityId) => {
    if (!hlsRef.current) return;

    if (qualityId === "auto") {
      hlsRef.current.currentLevel = -1;
    } else {
      const level = hlsRef.current.levels.findIndex(
        (l) => (l.height ? `${l.height}p` : "auto") === qualityId
      );
      if (level !== -1) {
        hlsRef.current.currentLevel = level;
      }
    }

    setQuality(qualityId);
    setShowQualityMenu(false);
  }, []);

  // Play/Pause
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    onTimeUpdate(videoRef.current.currentTime);
  }, [onTimeUpdate]);

  // Handle seek
  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;

    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume > 0) setIsMuted(false);
  };

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Toggle fullscreen
  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {
        // Fullscreen might be blocked
        console.warn("Fullscreen request failed");
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Handle playback rate change
  const handlePlaybackRateChange = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setShowSettingsMenu(false);
  };

  // Auto-hide controls on mouse idle
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(hideControlsTimeoutRef.current);

      if (isPlaying && !isFullscreen) {
        hideControlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    const container = containerRef.current;
    container?.addEventListener("mousemove", handleMouseMove);
    container?.addEventListener("mouseleave", () => setShowControls(false));

    return () => {
      container?.removeEventListener("mousemove", handleMouseMove);
      container?.removeEventListener("mouseleave", () => setShowControls(false));
      clearTimeout(hideControlsTimeoutRef.current);
    };
  }, [isPlaying, isFullscreen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in input/textarea
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = activeTag === "input" || activeTag === "textarea";
      if (isTyping) return;

      // Check if player container is in view or has focus
      if (!containerRef.current) return;

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          handlePlayPause();
          break;
        case "f":
          e.preventDefault();
          handleFullscreen();
          break;
        case "m":
          handleToggleMute();
          break;
        case "arrowright":
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoRef.current.currentTime + 5,
              duration
            );
          }
          break;
        case "arrowleft":
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
              videoRef.current.currentTime - 5,
              0
            );
          }
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((v) => Math.min(v + 0.1, 1));
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((v) => Math.max(v - 0.1, 0));
          break;
        case "b":
          setBrightness((b) => Math.min(b + 10, 150));
          break;
        case "o":
          setVideoOpacity((op) => Math.min(op + 10, 100));
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePlayPause, handleFullscreen, handleToggleMute, duration]);

  // Show encoding status
  if (video?.encodingStatus === "queued" || video?.encodingStatus === "processing") {
    return (
      <div
        ref={containerRef}
        className={`relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center ${className}`}
      >
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold">Video is processing...</p>
          <p className="text-sm text-slate-400 mt-1">
            {video.encodingStatus === "queued" ? "Queued for encoding" : "Encoding in progress"}
          </p>
        </div>
      </div>
    );
  }

  if (video?.encodingStatus === "failed") {
    return (
      <div
        ref={containerRef}
        className={`relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center ${className}`}
      >
        <div className="text-center text-white">
          <p className="text-lg font-semibold text-red-500">❌ Video encoding failed</p>
          <p className="text-sm text-slate-400 mt-2">Please contact support or try uploading again.</p>
        </div>
      </div>
    );
  }

  const source = getVideoSource();

  return (
    <div
      ref={containerRef}
      className={`video-player relative aspect-video w-full overflow-hidden rounded-xl bg-black group cursor-pointer ${className}`}
      onClick={handlePlayPause}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        poster={video?.thumbnail}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        playsInline
        controlsList="nodownload"
        style={{
          opacity: videoOpacity / 100,
          filter: `brightness(${brightness}%)`,
        }}
      />

      {/* Encoding Status Overlay */}
      {video?.encodingStatus && (
        <div className="absolute top-3 left-3 z-20 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur">
          {video.encodingStatus === "done" ? (
            <span>✅ Ready</span>
          ) : (
            <span className="animate-pulse">⏳ {video.encodingStatus}</span>
          )}
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
        </div>
      )}

      {/* Play/Pause Center Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 z-5 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all">
          <div className="rounded-full bg-red-600/80 p-4">
            <FaPlay className="text-white text-2xl ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`video-controls absolute inset-0 z-20 flex flex-col justify-between transition-opacity duration-300 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        <div className="flex-1" />

        <div className="pointer-events-auto space-y-2 px-4 pb-4">
          {/* Progress Bar */}
          <div
            className="group/progress h-1 bg-slate-600/50 rounded-full cursor-pointer hover:h-2 transition-all"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-red-600 rounded-full transition-all"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            />
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-between gap-4">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPause();
                }}
                className="text-white hover:scale-110 transition-transform"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <FaPause size={18} /> : <FaPlay size={18} />}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 group/volume">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMute();
                  }}
                  className="text-white hover:scale-110 transition-transform"
                  title="Mute (M)"
                >
                  {isMuted || volume === 0 ? (
                    <FaVolumeMute size={18} />
                  ) : (
                    <FaVolumeUp size={18} />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="w-0 group-hover/volume:w-16 transition-all opacity-0 group-hover/volume:opacity-100 cursor-pointer"
                  title="Volume"
                />
              </div>

              {/* Time Display */}
              <span className="text-white text-sm min-w-[100px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Quality Selector (only for HLS) */}
              {availableQualities.length > 0 && (
                <div className="relative group/quality">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQualityMenu(!showQualityMenu);
                    }}
                    className="text-white hover:scale-110 transition-transform text-xs font-semibold px-2 py-1 rounded bg-black/40 hover:bg-black/60"
                    title="Quality"
                  >
                    {quality === "auto" ? "Auto" : quality}
                  </button>

                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/80 rounded-lg shadow-lg border border-white/20 overflow-hidden z-30 pointer-events-auto">
                      {availableQualities.map((q) => (
                        <button
                          key={q.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQualityChange(q.id);
                          }}
                          className={`block w-full px-4 py-2 text-xs text-left transition-colors ${
                            quality === q.id
                              ? "bg-red-600 text-white"
                              : "text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {q.id === "auto" ? "Auto" : q.id}
                          {q.height && <span className="text-[10px] text-slate-500 ml-2">({q.height}p)</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Settings */}
              <div className="relative group/settings">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettingsMenu(!showSettingsMenu);
                  }}
                  className="text-white hover:scale-110 transition-transform"
                  title="Settings"
                >
                  <FaCog size={18} />
                </button>

                {showSettingsMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/80 rounded-lg shadow-lg border border-white/20 overflow-hidden z-30 pointer-events-auto max-w-xs">
                    {/* Playback Speed */}
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-xs font-semibold text-white mb-2">Playback Speed</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaybackRateChange(rate);
                            }}
                            className={`block w-full px-3 py-1.5 text-xs text-left rounded transition-colors ${
                              playbackRate === rate
                                ? "bg-red-600 text-white"
                                : "text-slate-300 hover:bg-slate-700"
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Brightness */}
                    <div className="px-4 py-2 border-b border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-white">Brightness</label>
                        <span className="text-xs text-slate-400">{brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={brightness}
                        onChange={(e) => {
                          e.stopPropagation();
                          setBrightness(Number(e.target.value));
                        }}
                        className="w-full"
                        title="Brightness (B to increase)"
                      />
                    </div>

                    {/* Opacity */}
                    <div className="px-4 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-white">Opacity</label>
                        <span className="text-xs text-slate-400">{videoOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={videoOpacity}
                        onChange={(e) => {
                          e.stopPropagation();
                          setVideoOpacity(Number(e.target.value));
                        }}
                        className="w-full"
                        title="Opacity (O to increase)"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFullscreen();
                }}
                className="text-white hover:scale-110 transition-transform"
                title="Fullscreen (F)"
              >
                <FaExpand size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to format time
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default VideoPlayer;
