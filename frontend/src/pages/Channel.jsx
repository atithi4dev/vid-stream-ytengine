import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getUserChannelProfile, getPublishedVideos, toggleSubscription } from "../api";
import { useAuthStore } from "../stores/authStore";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import VideoCard from "../components/VideoCard";
import UserAvatar from "../components/UserAvatar";

const Channel = () => {
  const { username } = useParams();
  const { user } = useAuthStore();
  const channelUsername = username === "me" ? user?.userName : username;

  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelUsername) return;

    const loadChannel = async () => {
      try {
        setLoading(true);
        const channelRes = await getUserChannelProfile(channelUsername);
        const profile = channelRes?.data?.data;
        setChannel(profile);

        const videosRes = await getPublishedVideos({ userId: profile?._id, page: 1, limit: 20 });
        const videosData = videosRes?.data?.data || [];
        const videosArray = Array.isArray(videosData) ? videosData : (videosData.docs || []);
        setVideos(videosArray);
      } finally {
        setLoading(false);
      }
    };

    loadChannel();
  }, [channelUsername]);

  const handleSubscription = async () => {
    if (!channel?._id) return;
    await toggleSubscription(channel._id);
    setChannel((prev) => ({
      ...prev,
      isSubscribed: !prev.isSubscribed,
      subscribersCount: prev.isSubscribed
        ? Math.max((prev.subscribersCount || 1) - 1, 0)
        : (prev.subscribersCount || 0) + 1,
    }));
  };

  if (loading) return <LoadingState label="Loading channel..." variant="grid" />;
  if (!channel) return <EmptyState title="Channel not found" subtitle="This profile is unavailable." />;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border-2 border-red-200 bg-white/95 shadow-[0_8px_32px_rgba(220,38,38,0.08)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none">
        <div className="h-36 bg-slate-200">
          {channel.coverImage && <img src={channel.coverImage} alt="cover" className="h-full w-full object-cover" />}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <UserAvatar src={channel.avatar} name={channel.fullName} size="lg" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">{channel.fullName}</h1>
              <p className="text-sm text-slate-500">@{channel.userName}</p>
              <p className="text-xs text-slate-400 mt-1">{channel.subscribersCount || 0} followers</p>
            </div>
          </div>

          {channel._id !== user?._id && (
            <button
              onClick={handleSubscription}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                channel.isSubscribed ? "border border-slate-300 text-slate-700" : "bg-red-600 text-white"
              }`}
            >
              {channel.isSubscribed ? "Subscribed" : "Follow"}
            </button>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Videos</h2>
        {videos.length === 0 ? (
          <EmptyState title="No videos yet" subtitle="This channel has no published videos." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Channel