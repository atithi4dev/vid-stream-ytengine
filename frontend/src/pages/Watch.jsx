import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  FaHeart,
  FaRegHeart,
  FaRegCommentDots,
  FaCoins,
  FaStar,
  FaShareAlt,
  FaTv,
  FaSlidersH,
  FaVolumeUp,
} from "react-icons/fa";
import {
  addComment,
  getAdaptiveStream,
  getPublishedVideos,
  getVideoById,
  getVideoComments,
  toggleSubscription,
  toggleVideoLike,
} from "../api";
import VideoCard from "../components/VideoCard";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import UserAvatar from "../components/UserAvatar";
import { formatDate, formatViews } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export default function Watch() {
  const { videoId } = useParams();
  const location = useLocation();
  const playerShellRef = useRef(null);
  const videoRef = useRef(null);
  const leftPaneRef = useRef(null);
  const settingsPanelRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const ambientContextRef = useRef(null);
  const ambientGainRef = useRef(null);
  const ambientNodesRef = useRef([]);
  const { userId } = useAuth();
  const isLiveMode = useMemo(() => {
    const byQuery = new URLSearchParams(location.search).get("mode") === "live";
    const byPath = location.pathname.startsWith("/live/");
    return byQuery || byPath;
  }, [location.search, location.pathname]);

  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [related, setRelated] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [videoOpacity, setVideoOpacity] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(100);
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);
  const [musicBlocked, setMusicBlocked] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [liveMessages, setLiveMessages] = useState([
    { id: "l1", user: "Rina", text: "This vibe is crazy 🔥" },
    { id: "l2", user: "PixelJ", text: "Coins rain incoming! 🪙" },
    { id: "l3", user: "Luna", text: "Drop more emojis 💖" },
  ]);
  const [liveChatDraft, setLiveChatDraft] = useState("");
  const [coinProgress, setCoinProgress] = useState(920);
  const [heartBursts, setHeartBursts] = useState([]);
  const [balloons, setBalloons] = useState([]);
  const [crowdCount, setCrowdCount] = useState(1240);
  const [tickerIndex, setTickerIndex] = useState(0);

  const liveEmojis = ["🔥", "💖", "✨", "🎉", "😎", "🫶", "🪩"];
  const streetTickerItems = [
    "Street Food Live: ramen challenge started! 🍜",
    "Crowd hype meter rising near the neon stage 🎆",
    "Viewers are sending hearts and coins non-stop 💖🪙",
    "Food cam: spicy bite reaction in 10 seconds 🌶️",
    "Busking band joined the stream lane 🎸",
  ];

  const spawnHeart = (emoji = "💖") => {
    const id = `heart-${Date.now()}-${Math.random()}`;
    const left = 78 + Math.floor(Math.random() * 18);
    const duration = 2.8 + Math.random() * 1.8;

    setHeartBursts((prev) => [...prev, { id, emoji, left, duration }]);
    window.setTimeout(() => {
      setHeartBursts((prev) => prev.filter((item) => item.id !== id));
    }, (duration + 0.4) * 1000);
  };

  const spawnBalloon = () => {
    const id = `balloon-${Date.now()}-${Math.random()}`;
    const icons = ["🎈", "🎈", "🎉"];
    const icon = icons[Math.floor(Math.random() * icons.length)];
    const left = 8 + Math.floor(Math.random() * 78);
    const duration = 6.5 + Math.random() * 2.5;
    setBalloons((prev) => [...prev, { id, icon, left, duration }]);

    window.setTimeout(() => {
      setBalloons((prev) => prev.filter((item) => item.id !== id));
    }, (duration + 0.5) * 1000);
  };

  const sendLiveMessage = () => {
    if (!liveChatDraft.trim()) return;
    const text = liveChatDraft.trim();
    setLiveMessages((prev) => [...prev, { id: `you-${Date.now()}`, user: "You", text }].slice(-24));
    setLiveChatDraft("");
    spawnHeart("💖");
    setCoinProgress((prev) => Math.min(prev + 40, 5000));
  };

  const fetchAll = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError("");

      const [videoRes, commentsRes, relatedRes] = await Promise.all([
        getVideoById(videoId),
        getVideoComments(videoId),
        getPublishedVideos({ page: 1, limit: 10 }),
      ]);

      const fetchedVideo = videoRes?.data?.data;
      setVideo(fetchedVideo);
      setComments(commentsRes?.data?.data?.docs || []);
      setRelated((relatedRes?.data?.data?.docs || []).filter((item) => item._id !== videoId));

      if (fetchedVideo?.encodingStatus === "ready") {
        try {
          await getAdaptiveStream(videoId);
        } catch {
          // HLS endpoint may not be fully available yet.
        }
      }
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load video.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAll();
  }, [videoId]);

  useEffect(() => {
    const onPullRefresh = async (event) => {
      const targetPath = event?.detail?.path;
      if (targetPath !== location.pathname) return;

      await fetchAll({ silent: true });
      event?.detail?.complete?.();
    };

    window.addEventListener("app:pull-refresh", onPullRefresh);
    return () => window.removeEventListener("app:pull-refresh", onPullRefresh);
  }, [location.pathname, videoId]);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    leftPaneRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [videoId]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    player.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    player.volume = Math.max(0, Math.min(1, volume / 100));
    player.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isTyping = activeTag === "input" || activeTag === "textarea";
      if (isTyping) return;

      const player = videoRef.current;
      if (!player) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (player.paused) {
          player.play();
        } else {
          player.pause();
        }
      }

      if (event.key === "ArrowRight") {
        player.currentTime = Math.min(player.currentTime + 5, player.duration || player.currentTime + 5);
      }

      if (event.key === "ArrowLeft") {
        player.currentTime = Math.max(player.currentTime - 5, 0);
      }

      if (event.key.toLowerCase() === "m") {
        player.muted = !player.muted;
        setMuted(player.muted);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setVolume((prev) => Math.min(prev + 5, 100));
        setMuted(false);
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setVolume((prev) => {
          const next = Math.max(prev - 5, 0);
          if (next === 0) setMuted(true);
          return next;
        });
      }

      if (event.key.toLowerCase() === "f") {
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        } else {
          playerShellRef.current?.requestFullscreen?.();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!isLiveMode) return;

    const names = ["Nina", "Kai", "Ari", "Mona", "Dex", "Ravi", "Juno"];
    const texts = [
      "That transition was smooth 😮",
      "Music is making this feel premium",
      "Dropping coins now!",
      "Chat is so alive tonight",
      "More energy please 🔥",
      "This stream aesthetic is elite",
      "Streamer is trying another street snack 🍢",
      "This food lane is pure chaos and fun 😂",
    ];

    const intervalId = window.setInterval(() => {
      const name = names[Math.floor(Math.random() * names.length)];
      const text = texts[Math.floor(Math.random() * texts.length)];
      setLiveMessages((prev) => {
        const next = [...prev, { id: `l-${Date.now()}-${Math.random()}`, user: name, text }];
        return next.slice(-18);
      });
      setCoinProgress((prev) => Math.min(prev + Math.floor(Math.random() * 110) + 35, 5000));
      if (Math.random() > 0.35) {
        spawnHeart(Math.random() > 0.5 ? "💖" : "🔥");
      }
      setCrowdCount((prev) => Math.max(800, Math.min(prev + (Math.random() > 0.5 ? 28 : -16), 4200)));
    }, 2600);

    return () => window.clearInterval(intervalId);
  }, [isLiveMode]);

  useEffect(() => {
    if (!isLiveMode) return;

    const tickerTimer = window.setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % streetTickerItems.length);
    }, 4200);

    return () => window.clearInterval(tickerTimer);
  }, [isLiveMode, streetTickerItems.length]);

  useEffect(() => {
    if (!isLiveMode) return;

    const balloonTimer = window.setInterval(() => {
      spawnBalloon();
    }, 3000);

    return () => window.clearInterval(balloonTimer);
  }, [isLiveMode]);

  useEffect(() => {
    if (!isLiveMode) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setMusicBlocked(true);
      return;
    }

    const startAmbient = async () => {
      try {
        if (!ambientContextRef.current) {
          const context = new AudioContextClass();
          const gain = context.createGain();
          gain.gain.value = 0;
          gain.connect(context.destination);

          const notes = [220, 277.18, 329.63];
          const nodes = notes.map((frequency) => {
            const oscillator = context.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.value = frequency;

            const localGain = context.createGain();
            localGain.gain.value = 0.25;

            oscillator.connect(localGain);
            localGain.connect(gain);
            oscillator.start();
            return { oscillator, localGain };
          });

          ambientContextRef.current = context;
          ambientGainRef.current = gain;
          ambientNodesRef.current = nodes;
        }

        const context = ambientContextRef.current;
        if (context.state === "suspended") {
          await context.resume();
        }

        const now = context.currentTime;
        const gain = ambientGainRef.current;
        gain.gain.cancelScheduledValues(now);
        gain.gain.linearRampToValueAtTime(musicOn ? 0.018 : 0, now + 0.35);
        setMusicBlocked(false);
      } catch {
        setMusicBlocked(true);
      }
    };

    startAmbient();
  }, [isLiveMode, musicOn]);

  useEffect(() => {
    if (isLiveMode) return;
    const context = ambientContextRef.current;
    const gain = ambientGainRef.current;
    if (!context || !gain) return;

    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.linearRampToValueAtTime(0, now + 0.25);
  }, [isLiveMode]);

  useEffect(() => {
    return () => {
      ambientNodesRef.current.forEach(({ oscillator }) => {
        try {
          oscillator.stop();
        } catch {
          // no-op
        }
      });
      ambientNodesRef.current = [];

      if (ambientContextRef.current) {
        ambientContextRef.current.close().catch(() => {});
        ambientContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!showPlayerSettings) return;

    const closeOnOutside = (event) => {
      const panel = settingsPanelRef.current;
      const button = settingsButtonRef.current;
      const target = event.target;

      if (panel?.contains(target) || button?.contains(target)) return;
      setShowPlayerSettings(false);
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
    };
  }, [showPlayerSettings]);

  const handleLike = async () => {
    if (!video) return;
    await toggleVideoLike(video._id);

    setVideo((prev) => ({
      ...prev,
      isLikedByUser: !prev.isLikedByUser,
      likeCount: prev.isLikedByUser ? Math.max((prev.likeCount || 1) - 1, 0) : (prev.likeCount || 0) + 1,
    }));
  };

  const handleSubscribe = async () => {
    if (!video?.owner?._id) return;
    await toggleSubscription(video.owner._id);
    setVideo((prev) => ({ ...prev, isOwnerSubscribed: !prev.isOwnerSubscribed }));
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;

    const res = await addComment(videoId, { content: commentText.trim() });
    const created = res?.data?.data;
    setComments((prev) => [created, ...prev]);
    setCommentText("");
  };

  if (loading) return <LoadingState label="Loading video..." variant="watch" />;
  if (error || !video) return <EmptyState title="Video unavailable" subtitle={error || "This video cannot be played right now."} />;

  return (
    <div className="mx-auto max-w-[1500px] gap-5 md:grid md:h-[calc(100vh-130px)] md:grid-cols-12 md:overflow-hidden">
      <section
        ref={leftPaneRef}
        className="space-y-4 md:col-span-8 md:h-full md:overflow-y-auto md:pr-2 lg:col-span-8 xl:col-span-8 thin-scrollbar"
      >
        <div
          ref={playerShellRef}
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-700"
        >
          <video
            ref={videoRef}
            key={video._id}
            src={video.videoFile}
            controls
            autoPlay
            muted={muted}
            playsInline
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            onContextMenu={(event) => event.preventDefault()}
            poster={video.thumbnail}
            className="aspect-video w-full"
            style={{
              opacity: videoOpacity / 100,
              filter: `brightness(${brightness}%)`,
            }}
          />

          {isLiveMode && (
            <>
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-fuchsia-900/20 via-transparent to-sky-500/10" />

              <div className="pointer-events-none absolute left-3 top-12 z-20 flex items-center gap-2 text-[10px] text-white">
                <span className="live-neon rounded-full border border-cyan-300/60 bg-black/45 px-2 py-0.5">NEON STREET</span>
                <span className="rounded-full bg-black/45 px-2 py-0.5">Crowd {Math.round(crowdCount).toLocaleString()}</span>
              </div>

              {heartBursts.map((heart) => (
                <span
                  key={heart.id}
                  className="live-float pointer-events-none absolute bottom-4 z-20 text-xl"
                  style={{
                    left: `${heart.left}%`,
                    animationDuration: `${heart.duration}s, ${Math.max(2.2, heart.duration - 1.1)}s`,
                    animationDelay: "0s, 0s",
                  }}
                >
                  {heart.emoji}
                </span>
              ))}

              {balloons.map((balloon) => (
                <span
                  key={balloon.id}
                  className="live-float pointer-events-none absolute bottom-5 z-10 text-2xl"
                  style={{
                    left: `${balloon.left}%`,
                    animationDuration: `${balloon.duration}s, ${Math.max(3.5, balloon.duration - 2)}s`,
                    animationDelay: "0s, 0s",
                  }}
                >
                  {balloon.icon}
                </span>
              ))}

              <div className="pointer-events-none absolute bottom-4 left-4 z-20 text-lg font-semibold text-white/35">
                {video.owner?.userName || "Creator"}
              </div>

              <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> LIVE PARTY
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-hidden border-t border-white/10 bg-black/45 py-1">
                <p className="live-ticker whitespace-nowrap px-4 text-[11px] font-medium text-cyan-100">{streetTickerItems[tickerIndex]}</p>
              </div>
            </>
          )}

          <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
            <button
              ref={settingsButtonRef}
              onClick={() => setShowPlayerSettings((prev) => !prev)}
              className="pointer-events-auto rounded-full bg-black/60 p-2 text-white backdrop-blur hover:bg-black/75"
              aria-label="Player settings"
            >
              <FaSlidersH className="text-sm" />
            </button>

            {showPlayerSettings && (
              <div
                ref={settingsPanelRef}
                className="pointer-events-auto fixed right-3 top-20 z-[2147483647] w-44 overflow-y-auto overscroll-contain rounded-xl border border-white/20 bg-black/80 p-2.5 text-xs text-white shadow-xl backdrop-blur sm:absolute sm:right-0 sm:top-11 sm:z-30 sm:w-52 sm:p-3"
                style={{ maxHeight: "min(calc(100% - 0.75rem), 340px)" }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">Player Settings</span>
                  <button
                    onClick={() => {
                      setVideoOpacity(100);
                      setBrightness(100);
                      setPlaybackRate(1);
                      setVolume(100);
                      setMuted(false);
                    }}
                    className="text-[10px] text-slate-200 underline"
                  >
                    Reset
                  </button>
                </div>

                <label className="mb-2 block">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <FaVolumeUp /> Volume
                    </span>
                    <span>{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(event) => {
                      const nextVolume = Number(event.target.value);
                      setVolume(nextVolume);
                      setMuted(nextVolume === 0);
                    }}
                    className="w-full"
                  />
                </label>

                <label className="mb-2 block">
                  <div className="mb-1 flex justify-between">
                    <span>Speed</span>
                    <span>{playbackRate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="25"
                    value={playbackRate * 100}
                    onChange={(event) => setPlaybackRate(Number(event.target.value) / 100)}
                    className="w-full"
                  />
                </label>

                <label className="mb-2 block">
                  <div className="mb-1 flex justify-between">
                    <span>Opacity</span>
                    <span>{videoOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="100"
                    value={videoOpacity}
                    onChange={(event) => setVideoOpacity(Number(event.target.value))}
                    className="w-full"
                  />
                </label>

                <label className="mb-2 block">
                  <div className="mb-1 flex justify-between">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="140"
                    value={brightness}
                    onChange={(event) => setBrightness(Number(event.target.value))}
                    className="w-full"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">Space: Play/Pause</span>
            <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">←/→: Seek</span>
            <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">↑/↓: Volume</span>
            <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">M: Mute</span>
            <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">F: Fullscreen</span>
          </div>
        </div>

        {isLiveMode && (
          <div className="rounded-2xl border border-violet-200/70 bg-gradient-to-r from-violet-50 via-white to-cyan-50 p-4 dark:border-violet-800/60 dark:from-violet-950/40 dark:via-slate-900 dark:to-cyan-950/40">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-500 px-2.5 py-1 text-xs font-semibold text-white">LIVE EXPERIENCE</span>
              <button
                type="button"
                onClick={() => setMusicOn((prev) => !prev)}
                className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              >
                {musicOn ? "Music On" : "Music Off"}
              </button>
              {musicBlocked && (
                <button
                  type="button"
                  onClick={() => setMusicOn(true)}
                  className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white"
                >
                  Enable Music
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Street-food party mode is active: crowd ticker, floating reactions, balloon moments, and calm background ambience.</p>
          </div>
        )}

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{video.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatViews(video.views)} views • {formatDate(video.createdAt)}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <UserAvatar src={video.owner?.avatar} name={video.owner?.userName} />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{video.owner?.userName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Creator</p>
              </div>
              {String(video.owner?._id) !== String(userId) && (
                <button
                  onClick={handleSubscribe}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    video.isOwnerSubscribed ? "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200" : "bg-sky-600 text-white"
                  }`}
                >
                  {video.isOwnerSubscribed ? "Following" : "Follow"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                {video.isLikedByUser ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
                {video.likeCount || 0}
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <FaCoins /> Coin
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <FaStar /> Favorite
              </button>
              <button className="hidden items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200 sm:flex">
                <FaShareAlt /> Share
              </button>
              <button className="hidden items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200 sm:flex">
                <FaTv /> Mini Player
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <FaRegCommentDots />
                {comments.length}
              </div>
            </div>
          </div>

          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-300">{video.description}</p>
        </div>

        {!isLiveMode && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Comments ({comments.length})</h2>

          <form onSubmit={handleComment} className="space-y-2">
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              rows={3}
              placeholder="Share your thoughts"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={!commentText.trim()}
              >
                Comment
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No comments yet.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="flex gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                  <UserAvatar src={comment.owner?.avatar} name={comment.owner?.userName || "User"} size="sm" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{comment.owner?.userName || "User"}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        )}
      </section>

      <aside className="space-y-3 md:col-span-4 md:h-full md:overflow-hidden md:pt-0 lg:col-span-4 xl:col-span-4">
        {isLiveMode && (
          <div className="rounded-xl border border-violet-200/70 bg-white/90 p-3 dark:border-violet-800/60 dark:bg-slate-900/80 md:h-[58%] md:min-h-[360px] md:max-h-[620px] md:flex md:flex-col">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Live Chat Arena</h2>
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">LIVE</span>
            </div>

            <div className="mb-3 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-2 thin-scrollbar dark:bg-slate-800/60 md:min-h-0 md:flex-1">
              {liveMessages.map((item) => (
                <div key={item.id} className="rounded-lg bg-white px-2 py-1.5 text-xs dark:bg-slate-900/75">
                  <span className="font-semibold text-sky-600 dark:text-sky-300">{item.user}: </span>
                  <span className="text-slate-700 dark:text-slate-200">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="mb-2 flex flex-wrap gap-1 text-base">
              {liveEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    spawnHeart(emoji);
                    setCoinProgress((prev) => Math.min(prev + 26, 5000));
                  }}
                  className="rounded bg-slate-100 px-1.5 py-0.5 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  spawnHeart("💖");
                  setCoinProgress((prev) => Math.min(prev + 40, 5000));
                }}
                className="rounded bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white hover:bg-rose-600"
              >
                Send Heart
              </button>
              <button
                type="button"
                onClick={() => {
                  spawnHeart("🍜");
                  spawnHeart("🍢");
                  setCoinProgress((prev) => Math.min(prev + 70, 5000));
                }}
                className="rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white hover:bg-amber-600"
              >
                Food Combo
              </button>
            </div>

            <div className="mb-2 flex gap-2">
              <input
                value={liveChatDraft}
                onChange={(event) => setLiveChatDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendLiveMessage();
                  }
                }}
                placeholder="Say something in live chat"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={sendLiveMessage}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
              >
                Send
              </button>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span>Coin Goal</span>
                <span>{coinProgress}/5000</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                  style={{ width: `${Math.min((coinProgress / 5000) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-white/70 p-2 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <p className="font-semibold">Street Stall Menu</p>
              <p className="mt-1">🍜 Neon Ramen · 🌮 Fire Taco · 🍢 Grill Skewer · 🧋 Bubble Tea</p>
            </div>
          </div>
        )}

        {!isLiveMode && (
        <div className="rounded-xl border border-slate-200 bg-white/90 p-3 dark:border-slate-700 dark:bg-slate-900/80">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ranking Today</h2>
          <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {["Top Animated Clips", "Hot Gaming Uploads", "Music Covers", "Tech Reviews"].map((item) => (
              <li key={item} className="rounded-lg bg-slate-50 px-2 py-1.5 dark:bg-slate-800">{item}</li>
            ))}
          </ul>
        </div>
        )}

        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {isLiveMode ? "Other Live Videos" : "Up Next"}
        </h2>
        <div className="thin-scrollbar space-y-3 md:max-h-[calc(100%-155px)] md:overflow-y-auto md:pr-1">
          {related.map((item) => (
            isLiveMode ? (
              <Link
                key={item._id}
                to={`/live/${item._id}`}
                className="group flex gap-2.5 rounded-xl border border-slate-200/80 bg-white/90 p-2.5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none"
              >
                <img src={item.thumbnail} alt={item.title} className="h-20 w-32 rounded-lg object-cover sm:h-24 sm:w-40" />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-800 dark:text-slate-100">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{item.owner?.userName || "Creator"}</p>
                  <p className="mt-0.5 text-[11px] text-rose-500">LIVE</p>
                </div>
              </Link>
            ) : (
              <VideoCard key={item._id} video={item} compact />
            )
          ))}
        </div>
      </aside>
    </div>
  );
}
