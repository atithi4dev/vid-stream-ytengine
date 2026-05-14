import axios from "axios";

const defaultBaseURL = import.meta.env.DEV
    ? "/api/v1"
    : `${window.location.origin}/api/v1`;

const api = axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL || defaultBaseURL,
    withCredentials: true,
});

// Request interceptor to log requests
api.interceptors.request.use(
    (config) => {
        console.log("📤 Request:", config.url, "withCredentials:", config.withCredentials);
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error?.response?.status;
        const requestUrl = originalRequest?.url || "";
        const isAuthEndpoint = [
            "/users/login",
            "/users/register",
            "/users/refresh-token",
        ].some((endpoint) => requestUrl.includes(endpoint));

        if (
            status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !isAuthEndpoint
        ) {
            originalRequest._retry = true;

            try {
                await api.post("/users/refresh-token");
                return api(originalRequest);
            } catch {
                return Promise.reject(error);
            }
    }

        return Promise.reject(error);
    }
);

export default api;