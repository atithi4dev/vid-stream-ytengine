import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema({
     video: {
          type: Schema.Types.ObjectId,
          ref: "Video",
     },  
     tweet: {
          type: Schema.Types.ObjectId,
          ref: "Tweet",
     },
     owner: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true
     },
     content: {
          type: String,
          required: true,
     }
},{
     timestamps: true
})

commentSchema.plugin(mongooseAggregatePaginate);

export default mongoose.model("Comment", commentSchema);