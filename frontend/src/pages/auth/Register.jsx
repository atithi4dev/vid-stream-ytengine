import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../api/auth.api";

const Register = () => {
    const navigate = useNavigate();


    const [form, setForm] = useState({
        userName: "",
        email: "",
        fullName: "",
        password: "",
    });

    const [avatar, setAvatar] = useState(null);
    const [coverImage, setCoverImage] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const formData = new FormData();

            Object.entries(form).forEach(([key, value]) => {
                formData.append(key, value);
            });

            if (avatar) formData.append("avatar", avatar)
            if (coverImage) formData.append("coverImage", coverImage)

            await registerUser(formData);
            navigate("/login");
        } catch (err) {
            setError(
                err?.response?.data?.message || "Registration Failed"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-slate-100 dark:bg-slate-950">
            <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-slate-900 to-indigo-900 p-12 text-white">
                <h1 className="text-4xl font-bold">Create your creator account</h1>
                <p className="mt-3 text-slate-300">Upload videos, manage playlists and grow your audience.</p>
            </div>

            <div className="flex items-center justify-center p-6">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-8 space-y-4 shadow-[0_10px_40px_rgba(15,23,42,0.09)] dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-none"
            >
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Register</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Set up profile and start publishing.</p>
                <input
                    type="text"
                    name="userName"
                    placeholder="Username"
                    value={form.userName}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />

                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />

                <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name"
                    value={form.fullName}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full text-sm border border-slate-300 rounded-xl p-2.5 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />

                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatar(e.target.files[0])}
                    className="w-full"
                />
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverImage(e.target.files[0])}
                    className="w-full"
                />

                {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                )}
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-sky-600 rounded-xl text-white p-2.5 font-semibold"
                >
                    {loading ? "Creating account..." : "Register"}
                </button>
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    Already registered? <Link to="/login" className="text-sky-600 font-medium">Login</Link>
                </p>
            </form>
            </div>
        </div>
    )
}

export default Register