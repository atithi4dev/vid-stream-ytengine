import api from "./axios"

export const updateAccountDetails = (data) => {
    return api.patch("/users/update-account", data);
}

export const updateAvatar = (formData) => {
    return api.patch("/users/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
}

export const updateCoverImage = (formData) => {
    return api.patch("/users/cover-image", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
}

export const getUserChannelProfile = (username) => {
    return api.get(`/users/c/${username}`);
}

export const getWatchHistory = () => {
    return api.get("/users/history");
}