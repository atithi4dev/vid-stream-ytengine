import api from "./axios";

export const getPublishedVideos = async (params)=>{
   return api.get("/videos/published", {params});
}

export const getVideoById = (id) => {
    return api.get(`/videos/${id}`);
}

export const uploadVideo = (formData)=>{
    return api.post("/videos", formData, {
        headers: {"Content-Type": "multipart/form-data"},
    });
}

export const getSignedUrls = (videoFilename, thumbnailFilename, title, description, videoFileType, thumbnailFileType) => {
    console.log(videoFilename, thumbnailFilename, title, description, videoFileType, thumbnailFileType);
    return api.post("/videos/upload-urls", {
        videoFilename,
        thumbnailFilename,
        title,
        description,
        videoFileType,
        thumbnailFileType,
    });
}

export const verifyVideoUpload = (videoId) => {
    return api.patch(`/videos/upload-complete/${videoId}`);
}

export const updateVideo = (id, formData) => {
    return api.patch(`/videos/${id}`, formData);
}

export const deleteVideo = (id)=>{
    return api.delete(`/videos/${id}`);
}

export const togglePublishStatus = (id)=> {
    return api.patch(`/videos/toggle/publish/${id}`);
}

export const getOwnVideos = (params) => {
  return api.get("/videos", { params });
};

export const getPrivateVideos = (params) => {
  return api.get("/videos/private", { params });
};

export const getAdaptiveStream = (videoId) => {
  return api.get(`/videos/stream/${videoId}/adaptive`);
};