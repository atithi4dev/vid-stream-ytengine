import api from './axios'

export const loginUser = async(data) => {
    return api.post("/users/login", data);
}

export const registerUser = async(data) => {
    return api.post("/users/register", data);
}

export const logoutUser = async() =>{
    return api.post("/users/logout");
}

export const getCurrentUser = async () =>{
    return api.get("/users/current-user");
}

export const changePassword = async (data) => {
    return api.post("/users/change-password", data);
}

export const refreshAccessToken = async () => {
    return api.post("/users/refresh-token");
}