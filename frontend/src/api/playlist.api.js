import api from "./axios";

export const createPlaylist = (data) =>{
  return api.post("/playlist", data);
}
export const getPlaylistById = (id) =>{
  return api.get(`/playlist/${id}`);
}
export const updatePlaylist = (id, data) =>{
  return api.patch(`/playlist/${id}`, data);
}
export const deletePlaylist = (id) =>{
  return api.delete(`/playlist/${id}`);
}
export const addVideoToPlaylist = (playlistId, videoId) =>{
  return api.patch(`/playlist/add/${videoId}/${playlistId}`);
}
export const removeVideoFromPlaylist = (playlistId, videoId) =>{
  return api.patch(`/playlist/remove/${videoId}/${playlistId}`);
}
export const getUserPlaylists = (id) =>{
  return api.get(`/playlist/user/${id}`);
}