import { useEffect, useState } from "react";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
} from "../api/playlist.api";
import { useAuthStore } from "../stores/authStore";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { formatViews } from "../utils/format";
import { getOwnVideos as fetchOwnVideos } from "../api/video.api";

export default function Playlists() {
  const { user } = useAuthStore();
  const userId = user?._id;
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [ownVideos, setOwnVideos] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;

    const fetchPlaylists = async () => {
      try {
        const [playlistRes, videoRes] = await Promise.all([
          getUserPlaylists(userId),
          fetchOwnVideos({ page: 1, limit: 50 }),
        ]);

        const allPlaylists = playlistRes?.data?.data || [];
        setPlaylists(allPlaylists);
        setOwnVideos(videoRes?.data?.data?.docs || []);

        if (allPlaylists[0]?._id) {
          const details = await getPlaylistById(allPlaylists[0]._id);
          setSelectedPlaylist(details?.data?.data || null);
        }
      } catch (err) {
        setError("Failed to load playlists");
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, [userId]);

  const refreshSelected = async (playlistId) => {
    const details = await getPlaylistById(playlistId);
    setSelectedPlaylist(details?.data?.data || null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    try {
      const res = await createPlaylist({ name, description });
      const created = res?.data?.data;
      setPlaylists((prev) => [created, ...prev]);
      await refreshSelected(created._id);
      setName("");
      setDescription("");
    } catch (err) {
      console.error("Create playlist failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePlaylist(id);
      setPlaylists((prev) => prev.filter((p) => p._id !== id));
      if (selectedPlaylist?._id === id) setSelectedPlaylist(null);
    } catch (err) {
      console.error("Delete failed");
    }
  };

  const handleAddVideo = async (videoId) => {
    if (!selectedPlaylist?._id) return;
    await addVideoToPlaylist(selectedPlaylist._id, videoId);
    await refreshSelected(selectedPlaylist._id);
  };

  const handleRemoveVideo = async (videoId) => {
    if (!selectedPlaylist?._id) return;
    await removeVideoFromPlaylist(selectedPlaylist._id, videoId);
    await refreshSelected(selectedPlaylist._id);
  };

  if (loading) return <LoadingState label="Loading playlists..." variant="split" />;
  if (error) return <EmptyState title="Unable to load playlists" subtitle={error} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-2xl border-2 border-red-200 bg-white/95 p-5 shadow-[0_8px_32px_rgba(220,38,38,0.08)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none">
        <h1 className="text-lg font-bold text-red-700 dark:text-red-400">My Playlists</h1>
        <form onSubmit={handleCreate} className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={3}
          />
          <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white">Create Playlist</button>
        </form>

        <div className="space-y-2">
          {playlists.map((playlist) => (
            <button
              key={playlist._id}
              onClick={() => refreshSelected(playlist._id)}
              className="flex w-full items-center justify-between rounded-lg border-2 border-red-100 bg-red-50 p-3 text-left hover:bg-red-100 dark:border-slate-800 dark:bg-black/50 dark:hover:bg-black/60"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">{playlist.name}</p>
                <p className="text-xs text-slate-500">{playlist.description}</p>
              </div>
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(playlist._id);
                }}
                className="text-xs text-red-500"
              >
                Delete
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-red-200 bg-white/95 p-5 shadow-[0_8px_32px_rgba(220,38,38,0.08)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none">
        {!selectedPlaylist ? (
          <EmptyState title="Select a playlist" subtitle="Create or choose a playlist to manage videos." />
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold text-red-700 dark:text-red-400">{selectedPlaylist.name}</h2>
              <p className="text-sm text-slate-500">{selectedPlaylist.description}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Videos in playlist</h3>
              {(selectedPlaylist.videos || []).length === 0 ? (
                <p className="text-sm text-slate-500">No videos in this playlist.</p>
              ) : (
                selectedPlaylist.videos.map((video) => (
                  <div key={video._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{video.title}</p>
                      <p className="text-xs text-slate-500">{formatViews(video.views)} views</p>
                    </div>
                    <button onClick={() => handleRemoveVideo(video._id)} className="text-xs text-red-500">Remove</button>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Add from my videos</h3>
              {ownVideos.map((video) => (
                <div key={video._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <p className="text-sm text-slate-700">{video.title}</p>
                  <button onClick={() => handleAddVideo(video._id)} className="text-xs text-red-600">Add</button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
