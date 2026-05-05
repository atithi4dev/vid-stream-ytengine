import { useEffect, useState } from "react";
import {
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
} from "../api";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import UserAvatar from "../components/UserAvatar";
import { formatDate } from "../utils/format";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

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
      return userData;
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load profile details.");
      return null;
    } finally {
      if (withLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile({ withLoader: true });
  }, []);

  const handleAccountUpdate = async (event) => {
    event.preventDefault();
    setStatus("");
    setError("");
    setSaving((prev) => ({ ...prev, account: true }));

    try {
      await updateAccountDetails(editForm);
      await fetchProfile();
      setStatus("Account details updated successfully.");
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
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      await updateAvatar(formData);
      await fetchProfile();
      setAvatarFile(null);
      setStatus("Avatar updated successfully.");
    } catch (avatarError) {
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
      const formData = new FormData();
      formData.append("coverImage", coverFile);
      await updateCoverImage(formData);
      await fetchProfile();
      setCoverFile(null);
      setStatus("Cover image updated successfully.");
    } catch (coverError) {
      setError(coverError?.response?.data?.message || "Failed to update cover image.");
    } finally {
      setSaving((prev) => ({ ...prev, cover: false }));
    }
  };

  if (loading) return <LoadingState label="Loading profile..." variant="default" />;
  if (!profile) return <EmptyState title="Profile unavailable" subtitle={error || "Unable to fetch your profile."} />;

  const rows = [
    { label: "Full Name", value: profile.fullName || "-" },
    { label: "Username", value: profile.userName ? `@${profile.userName}` : "-" },
    { label: "Email", value: profile.email || "-" },
    { label: "User ID", value: profile._id || "-" },
    { label: "Joined", value: profile.createdAt ? formatDate(profile.createdAt) : "-" },
    { label: "Last Updated", value: profile.updatedAt ? formatDate(profile.updatedAt) : "-" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
        <div className="h-36 w-full bg-slate-200 dark:bg-slate-800">
          {profile.coverImage && (
            <img
              src={profile.coverImage}
              alt="Cover"
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 p-5">
          <UserAvatar src={profile.avatar} name={profile.fullName || profile.userName} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{profile.fullName || "My Profile"}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{profile.userName ? `@${profile.userName}` : ""}</p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">Account Details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{row.label}</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-700 dark:text-slate-200">{row.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={handleAccountUpdate}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none"
        >
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Edit Profile</h3>
          <label className="block space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <span>Full Name</span>
            <input
              value={editForm.fullName}
              onChange={(event) => setEditForm((prev) => ({ ...prev, fullName: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <span>Username</span>
            <input
              value={editForm.userName}
              onChange={(event) => setEditForm((prev) => ({ ...prev, userName: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <button
            type="submit"
            disabled={saving.account}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {saving.account ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <form
          onSubmit={handlePasswordChange}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none"
        >
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Change Password</h3>
          <label className="block space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <span>Current Password</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <span>New Password</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <button
            type="submit"
            disabled={saving.password}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {saving.password ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Update Avatar</h3>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-slate-700 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-200"
          />
          <button
            onClick={handleAvatarUpdate}
            disabled={!avatarFile || saving.avatar}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {saving.avatar ? "Uploading..." : "Upload Avatar"}
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Update Cover Image</h3>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-slate-700 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-200"
          />
          <button
            onClick={handleCoverUpdate}
            disabled={!coverFile || saving.cover}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {saving.cover ? "Uploading..." : "Upload Cover"}
          </button>
        </div>
      </section>

      {status && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {status}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
