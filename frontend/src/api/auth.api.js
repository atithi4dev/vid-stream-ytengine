import api from './axios'

export const loginUser = async(data) => {
    return api.post("/users/login", data);
}

export const registerUser = async(formData) => {
    return api.post("/users/register", formData, {
        headers: {"Content-Type": "multipart/form-data"},
    });
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