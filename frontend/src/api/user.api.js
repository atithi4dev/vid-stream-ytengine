import api from "./axios"

export const updateAccountDetails = (data) => {
    return api.patch("/users/update-account", data);
}

export const getProfileImageSignedUrl = (imageName, imageType, fileType) => {
    return api.post("/users/upload-profile-image", {
        imageName,
        imageType,
        fileType,
    });
}

export const verifyProfileImageUpload = (imageType) => {
    return api.patch("/users/confirm/upload-profile-image", {
        imageType,
    });
}

export const getUserChannelProfile = (username) => {
    return api.get(`/users/c/${username}`);
}

export const getWatchHistory = () => {
    return api.get("/users/history");
}