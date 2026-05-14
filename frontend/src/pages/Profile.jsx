import { useEffect, useState, useRef } from "react";
import {
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  getProfileImageSignedUrl,
  verifyProfileImageUpload,
  getPublishedVideos,
  getOwnVideos,
  getPrivateVideos,
} from "../api";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import UserAvatar from "../components/UserAvatar";
import VideoCard from "../components/VideoCard";
import { formatDate } from "../utils/format";
import { useAuthStore } from "../stores/authStore";
import { FaUser, FaEnvelope, FaIdBadge, FaLock, FaImage, FaCheck, FaExclamationCircle, FaEdit, FaPlay, FaClock } from "react-icons/fa";

export default function Profile() {
  const { setUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState("published");
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Video lists
  const [publishedVideos, setPublishedVideos] = useState([]);
  const [ownVideos, setOwnVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [publishedPage, setPublishedPage] = useState(1);
  const [videosPage, setVideosPage] = useState(1);
  const [hasMorePublished, setHasMorePublished] = useState(true);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);

  // Edit form
  const [editForm, setEditForm] = useState({ fullName: "", userName: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [saving, setSaving] = useState({
    account: false,
    password: false,
    avatar: false,
    cover: false,
  });

  // For avatar/cover preview
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  // Refs for infinite scroll
  const publishedLoadMoreRef = useRef(null);
  const videosLoadMoreRef = useRef(null);

  const fetchProfile = async ({ withLoader = false } = {}) => {
    try {
      if (withLoader) setLoading(true);
      setError("");
      const response = await getCurrentUser();
      const userData = response?.data?.data || null;
      setProfile(userData);
      setUser(userData);
      setEditForm({
        fullName: userData?.fullName || "",
        userName: userData?.userName || "",
      });
      setAvatarPreview(userData?.avatar || null);
      console.log(userData.avatar)
      setCoverPreview(userData?.coverImage || null);
      return userData;
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load profile details.");
      return null;
    } finally {
      if (withLoader) setLoading(false);
    }
  };

  const fetchPublishedVideos = async (page = 1) => {
    try {
      setVideosLoading(true);
      const response = await getPublishedVideos({
        page,
        limit: 12,
        userId: profile?._id,
      });
      const payload = response?.data?.data || {};
      const videos = Array.isArray(payload) ? payload : (payload.docs || []);
      
      if (page === 1) {
        setPublishedVideos(videos);
      } else {
        setPublishedVideos(prev => [...prev, ...videos]);
      }
      
      // Determine if there are more pages
      let hasNextPage = false;
      if (Array.isArray(payload)) {
        hasNextPage = videos.length >= 12;
      } else {
        hasNextPage = payload.hasNextPage || false;
      }
      
      // If pagination request returns 0 results, definitely no more pages
      if (page > 1 && videos.length === 0) {
        hasNextPage = false;
      }
      
      setHasMorePublished(hasNextPage);
      setPublishedPage(page);
    } catch (err) {
      console.error("Failed to fetch published videos:", err);
      setHasMorePublished(false);
    } finally {
      setVideosLoading(false);
    }
  };

  const fetchOwnVideos = async (page = 1) => {
    try {
      setVideosLoading(true);
      const response = await getPrivateVideos({
        page,
        limit: 12,
      });
      const payload = response?.data?.data || {};
      const videos = Array.isArray(payload) ? payload : (payload.docs || []);
      
      if (page === 1) {
        setOwnVideos(videos);
      } else {
        setOwnVideos(prev => [...prev, ...videos]);
      }
      
      // Determine if there are more pages
      let hasNextPage = false;
      if (Array.isArray(payload)) {
        hasNextPage = videos.length >= 12;
      } else {
        hasNextPage = payload.hasNextPage || false;
      }
      
      // If pagination request returns 0 results, definitely no more pages
      if (page > 1 && videos.length === 0) {
        hasNextPage = false;
      }
      
      setHasMoreVideos(hasNextPage);
      setVideosPage(page);
    } catch (err) {
      console.error("Failed to fetch private videos:", err);
      setHasMoreVideos(false);
    } finally {
      setVideosLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile({ withLoader: true });
  }, []);

  useEffect(() => {
    if (profile) {
      if (activeTab === "published") {
        fetchPublishedVideos(1);
      } else {
        fetchOwnVideos(1);
      }
    }
  }, [profile, activeTab]);

  // Infinite scroll for published videos
  useEffect(() => {
    const target = publishedLoadMoreRef.current;
    if (!target || videosLoading || !hasMorePublished || activeTab !== "published") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMorePublished && !videosLoading) {
          fetchPublishedVideos(publishedPage + 1);
        }
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMorePublished, videosLoading, publishedPage, activeTab]);

  // Infinite scroll for own videos
  useEffect(() => {
    const target = videosLoadMoreRef.current;
    if (!target || videosLoading || !hasMoreVideos || activeTab !== "videos") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMoreVideos && !videosLoading) {
          fetchOwnVideos(videosPage + 1);
        }
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreVideos, videosLoading, videosPage, activeTab]);

  const handleAccountUpdate = async (event) => {
    event.preventDefault();
    setStatus("");
    setError("");
    setSaving((prev) => ({ ...prev, account: true }));

    try {
      await updateAccountDetails(editForm);
      await fetchProfile();
      setStatus("Account details updated successfully.");
      setTimeout(() => setStatus(""), 3000);
    } catch (updateError) {
      setError(updateError?.response?.data?.message || "Failed to update account details.");
    } finally {
      setSaving((prev) => ({ ...prev, account: false }));
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) return;

    setStatus("");
    setError("");
    setSaving((prev) => ({ ...prev, password: true }));

    try {
      await changePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setStatus("Password changed successfully.");
      setTimeout(() => setStatus(""), 3000);
    } catch (passwordError) {
      setError(passwordError?.response?.data?.message || "Failed to change password.");
    } finally {
      setSaving((prev) => ({ ...prev, password: false }));
    }
  };

  const handleAvatarUpdate = async () => {
    if (!avatarFile) return;

    setStatus("");
    setError("");
    setSaving((prev) => ({ ...prev, avatar: true }));

    try {
      console.log("🖼️ Starting avatar upload...");
      
      // Step 1: Get signed URL from backend
      console.log("📋 Requesting signed URL for avatar...");
      const signedUrlResponse = await getProfileImageSignedUrl(
        avatarFile.name,
        "avatar",
        avatarFile.type
      );
      const { imageSignedUrl } = signedUrlResponse.data.data;
      console.log("✅ Got signed URL");

      // Step 2: Upload directly to S3
      console.log("📤 Uploading to S3...");
      const s3Response = await fetch(imageSignedUrl, {
        method: "PUT",
        body: avatarFile,
        headers: {
          "Content-Type": avatarFile.type,
        },
      });
      console.log("✅ S3 upload response:", s3Response.status);

      // Step 3: Verify upload with backend
      console.log("🔍 Verifying upload with backend...");
      await verifyProfileImageUpload("avatar");
      console.log("✅ Verification successful");
      
      await fetchProfile();
      setAvatarFile(null);
      setStatus("Avatar updated successfully.");
      setTimeout(() => setStatus(""), 3000);
    } catch (avatarError) {
      console.error("❌ Avatar upload error:", avatarError);
      console.error("Error response:", avatarError?.response?.data);
      setError(avatarError?.response?.data?.message || "Failed to update avatar.");
    } finally {
      setSaving((prev) => ({ ...prev, avatar: false }));
    }
  };

  const handleCoverUpdate = async () => {
    if (!coverFile) return;

    setStatus("");
    setError("");
    setSaving((prev) => ({ ...prev, cover: true }));

    try {
      console.log("🖼️ Starting cover image upload...");
      
      // Step 1: Get signed URL from backend
      console.log("📋 Requesting signed URL for coverImage...");
      const signedUrlResponse = await getProfileImageSignedUrl(
        coverFile.name,
        "coverImage",
        coverFile.type
      );
      const { imageSignedUrl } = signedUrlResponse.data.data;
      console.log("✅ Got signed URL");

      // Step 2: Upload directly to S3
      console.log("📤 Uploading to S3...");
      const s3Response = await fetch(imageSignedUrl, {
        method: "PUT",
        body: coverFile,
        headers: {
          "Content-Type": coverFile.type,
        },
      });
      console.log("✅ S3 upload response:", s3Response.status);

      // Step 3: Verify upload with backend
      console.log("🔍 Verifying upload with backend...");
      await verifyProfileImageUpload("coverImage");
      console.log("✅ Verification successful");
      
      await fetchProfile();
      setCoverFile(null);
      setStatus("Cover image updated successfully.");
      setTimeout(() => setStatus(""), 3000);
    } catch (coverError) {
      console.error("❌ Cover upload error:", coverError);
      console.error("Error response:", coverError?.response?.data);
      setError(coverError?.response?.data?.message || "Failed to update cover image.");
    } finally {
      setSaving((prev) => ({ ...prev, cover: false }));
    }
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  if (loading) return <LoadingState label="Loading profile..." variant="default" />;
  if (!profile) return <EmptyState title="Profile unavailable" subtitle={error || "Unable to fetch your profile."} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header with Cover and Avatar */}
      <div className="overflow-hidden rounded-3xl border-2 border-red-200 bg-white/95 shadow-[0_12px_40px_rgba(220,38,38,0.12)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none">
        {/* Cover Image */}
        <div className="relative group h-48 w-full overflow-hidden bg-gradient-to-br from-red-600 via-red-500 to-red-700">
          {coverPreview && (
            <img
              src={coverPreview}
              alt="Cover"
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
          
          {/* Cover Edit Button - Hover */}
          <label className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 opacity-0 transition cursor-pointer group-hover:opacity-100">
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <FaEdit className="text-3xl text-white" />
              <span className="text-white font-semibold">Edit Cover</span>
            </div>
          </label>
          
          {coverFile && (
            <button
              type="button"
              onClick={handleCoverUpdate}
              disabled={saving.cover}
              className="absolute bottom-4 right-4 z-20 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving.cover ? "Saving..." : "Save"}
            </button>
          )}
        </div>

        {/* Profile Info */}
        <div className="relative -mt-16 px-6 pb-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
            <div className="group relative ring-4 ring-white dark:ring-slate-900">
              <UserAvatar src={avatarPreview} name={profile.fullName || profile.userName} size="xl" />
              
              {/* Avatar Edit Button - Hover */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <FaEdit className="text-xl text-white" />
              </label>
              
              {avatarFile && (
                <button
                  onClick={handleAvatarUpdate}
                  disabled={saving.avatar}
                  className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full disabled:opacity-50"
                >
                  {saving.avatar ? "..." : <FaCheck />}
                </button>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
                {profile.fullName || "User Profile"}
              </h1>
              <p className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400">
                @{profile.userName || "username"}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Joined {profile.createdAt ? formatDate(profile.createdAt) : "recently"}
              </p>
            </div>

            <button
              onClick={() => setShowEditModal(true)}
              className="ml-auto flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-6 py-2 font-semibold transition"
            >
              <FaEdit className="text-lg" />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {status && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/20">
          <FaCheck className="text-lg text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{status}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/20">
          <FaExclamationCircle className="text-lg text-red-600 dark:text-red-400" />
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b-2 border-slate-200 dark:border-slate-800">
        {[
          { id: "published", label: "Published", icon: FaPlay },
          { id: "videos", label: "Private", icon: FaClock },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-4 px-4 py-3 text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-red-600 text-red-600 dark:border-red-500 dark:text-red-400"
                  : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="text-lg" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Videos Tab */}
      <div>
        {videosLoading && publishedVideos.length === 0 && ownVideos.length === 0 ? (
          <LoadingState label="Loading videos..." variant="default" />
        ) : activeTab === "published" && publishedVideos.length === 0 ? (
          <EmptyState title="No published videos" subtitle="Start by publishing your first video" />
        ) : activeTab === "videos" && ownVideos.length === 0 ? (
          <EmptyState title="No private videos" subtitle="Upload your first private video to get started" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 w-full">
              {(activeTab === "published" ? publishedVideos : ownVideos).map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>

            {(activeTab === "published" ? hasMorePublished : hasMoreVideos) && (
              <div
                ref={activeTab === "published" ? publishedLoadMoreRef : videosLoadMoreRef}
                className="py-4 text-center"
              >
                {videosLoading && <p className="text-slate-600 dark:text-slate-400">Loading more videos...</p>}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-2xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Status Messages in Modal */}
            {status && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                <FaCheck className="text-lg text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{status}</p>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/20">
                <FaExclamationCircle className="text-lg text-red-600 dark:text-red-400" />
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Account Details Form */}
              <form
                onSubmit={handleAccountUpdate}
                className="space-y-4 border-b pb-6 dark:border-slate-800"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Account Information</h3>
                
                <FormField
                  icon={<FaUser />}
                  label="Full Name"
                  placeholder="Enter your full name"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                />
                <FormField
                  icon={<FaIdBadge />}
                  label="Username"
                  placeholder="Enter your username"
                  value={editForm.userName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, userName: e.target.value }))}
                />
                <FormField
                  icon={<FaEnvelope />}
                  label="Email"
                  disabled
                  value={profile.email || "-"}
                />

                <button
                  type="submit"
                  disabled={saving.account}
                  className="w-full rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 font-semibold transition disabled:opacity-50"
                >
                  {saving.account ? "Saving..." : "Save Changes"}
                </button>
              </form>

              {/* Password Change Form */}
              <form
                onSubmit={handlePasswordChange}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaLock /> Change Password
                </h3>
                
                <FormField
                  icon={<FaLock />}
                  label="Current Password"
                  type="password"
                  placeholder="Enter your current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                />
                <FormField
                  icon={<FaLock />}
                  label="New Password"
                  type="password"
                  placeholder="Enter your new password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                />

                <button
                  type="submit"
                  disabled={saving.password}
                  className="w-full rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 font-semibold transition disabled:opacity-50"
                >
                  {saving.password ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function FormField({ icon, label, type = "text", placeholder, value, onChange, disabled = false }) {
  return (
    <div>
      <label className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        <span className="text-red-600 dark:text-red-400">{icon}</span>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-lg border-2 border-red-200 bg-white px-4 py-2 text-base text-slate-900 placeholder:text-slate-400 transition focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-800 dark:bg-black/50 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-red-600 dark:focus:ring-red-900/50 dark:disabled:bg-slate-900 dark:disabled:text-slate-500"
      />
    </div>
  );
}
