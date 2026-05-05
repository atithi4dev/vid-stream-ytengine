import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// ====== Layouts ======
import MainLayout from "./layouts/MainLayout";

// ====== Pages (auth) ======
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// ====== Pages (core) ======
import Home from "./pages/Home";
import Watch from "./pages/Watch";
import Upload from "./pages/Upload";
import Channel from "./pages/Channel";
import Dashboard from "./pages/Dashboard";
import Playlists from "./pages/Playlists";
import WatchHistory from "./pages/WatchHistory";
import BiliPlaceholder from "./pages/BiliPlaceholder";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Live from "./pages/Live";

// ====== Utils ======
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/watch/:videoId" element={<Watch />} />
          <Route path="/live/:videoId" element={<Watch />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/channel/:username" element={<Channel />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/watch-history" element={<WatchHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/live" element={<Live />} />
          <Route path="/dynamic" element={<BiliPlaceholder />} />
          <Route path="/ranking" element={<BiliPlaceholder />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
