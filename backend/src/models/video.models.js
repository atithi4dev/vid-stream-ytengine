import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    encodingStatus: {
      type: String,
      enum: [
        "pending_upload",
        "queued",
        "processing",
        "transcoded",
        "ready",
        "failed"
      ],
      default: "pending_upload",
    },
    hls: {
      masterUrl: String,
      resolutions: {
        "1080p": { playlistUrl: String, count: Number, size: Number },
        "720p": { playlistUrl: String, count: Number, size: Number },
        "360p": { playlistUrl: String, count: Number, size: Number },
      },
    },
    metaData: {
      estimatedDuration: {
        type: Number,
      },
      encodeResults: [
        {
          name: {
            type: String,
          },
          encodeTime: {
            type: Number,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export default mongoose.model("Video", videoSchema);
