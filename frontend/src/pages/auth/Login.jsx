import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, getCurrentUser } from "../../api/auth.api";
import { useAuthStore } from "../../stores/authStore";

const Login = () => {
    const navigate = useNavigate();
    const { setUser } = useAuthStore();

    const [form, setForm] = useState({
        userName: "",
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const loginRes = await loginUser(form);
            
            // Save access token to localStorage for WebSocket auth
            const accessToken = loginRes?.data?.data?.accessToken;
            if (accessToken) {
                localStorage.setItem("accessToken", accessToken);
                console.log("✅ Access token saved");
            }
            
            const res = await getCurrentUser();
            setUser(res?.data?.data || null);

            navigate("/");
        } catch (error) {
            setError(
                error?.response?.data?.message || "Login failed"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-slate-100 dark:bg-slate-950">
            <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-red-600 to-red-700 p-12 text-white">
                <h1 className="text-4xl font-bold">Welcome to Youtube</h1>
                <p className="mt-3 text-red-100">Stream, publish, and grow your creator channel.</p>
            </div>

            <div className="flex items-center justify-center p-6">
            <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-8 space-y-4 shadow-[0_10px_40px_rgba(15,23,42,0.09)] dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-none">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Login</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Use your username + email + password to continue.</p>
                <input
                    type="text"
                    name="userName"
                    placeholder="Username"
                    value={form.userName}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                ></input>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                ></input>
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />

                {
                    error && (
                        <p className="text-red-600 text-sm">{error}</p>
                    )
                }
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 rounded-xl text-white p-2.5 font-semibold hover:bg-red-700"
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    New here? <Link className="text-red-600 font-medium hover:text-red-700" to="/register">Create account</Link>
                </p>
            </form>
            </div>
        </div>
    )
}

export default Login