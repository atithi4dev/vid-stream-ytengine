import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { getSignedUrl, verifyVideoUpload } from "../api";

const Upload = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onDropVideo = (acceptedFiles) => {
    if (acceptedFiles?.[0]) setVideoFile(acceptedFiles[0]);
  };

  const onDropThumbnail = (acceptedFiles) => {
    if (acceptedFiles?.[0]) setThumbnail(acceptedFiles[0]);
  };

  const videoDropzone = useDropzone({
    onDrop: onDropVideo,
    multiple: false,
    accept: { "video/*": [] },
  });

  const thumbDropzone = useDropzone({
    onDrop: onDropThumbnail,
    multiple: false,
    accept: { "image/*": [] },
  });

  const canSubmit = useMemo(
    () => title.trim() && description.trim() && thumbnail && videoFile,
    [title, description, thumbnail, videoFile]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError("");

    try {
      // Step 1: Get signed URL from backend
      const signedUrlResponse = await getSignedUrl(
        videoFile.name,
        title,
        description,
        videoFile.type
      );
      
      const { uploadUrl, videoId } = signedUrlResponse?.data?.data;
      
      if (!uploadUrl || !videoId) {
        throw new Error("Failed to get signed URL");
      }

      // Step 2: Upload video directly to S3 using signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: videoFile,
        headers: {
          "Content-Type": videoFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload video to S3");
      }

      // Step 3: Verify upload with backend
      await verifyVideoUpload(videoId);

      // Step 4: Navigate to watch page
      navigate(`/watch/${videoId}`);
    } catch (uploadError) {
      setError(uploadError?.response?.data?.message || uploadError.message || "Failed to upload video.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Upload Video</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Publish a new video with thumbnail and metadata.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900/80"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter video title"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Enter video description"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DropzoneCard
            title="Video file"
            subtitle="MP4, MOV or WEBM"
            file={videoFile}
            dropzone={videoDropzone}
          />

          <DropzoneCard
            title="Thumbnail"
            subtitle="JPG or PNG"
            file={thumbnail}
            dropzone={thumbDropzone}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? "Uploading..." : "Publish Video"}
        </button>
      </form>
    </div>
  )
}

function DropzoneCard({ title, subtitle, file, dropzone }) {
  const { getRootProps, getInputProps, isDragActive } = dropzone;

  return (
    <div
      {...getRootProps()}
      className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
        isDragActive
          ? "border-sky-400 bg-sky-50 dark:bg-sky-900/20"
          : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70"
      }`}
    >
      <input {...getInputProps()} />
      <p className="font-semibold text-slate-700 dark:text-slate-100">{title}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{file?.name || "Drag & drop or click to select"}</p>
    </div>
  );
}

export default Upload