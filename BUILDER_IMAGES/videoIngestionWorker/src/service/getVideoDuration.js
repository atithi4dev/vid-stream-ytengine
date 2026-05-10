import ffmpeg from "fluent-ffmpeg"

export const getVideoDuration = (inputPath)=>{
    return new Promise((resolve, reject)=>{
        ffmpeg.ffprobe(inputPath, (err, metadata)=>{
            if(err){
                return reject(
                    new Error(`Failed to get video duration for ${inputPath}: ${err.message}`)
                );
            }
            const duration = metadata.format.duration;
            resolve(duration);
        })
    })
}