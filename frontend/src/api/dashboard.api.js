import api from "./axios";

export const getChannelStats = (channelId) => {
  return api.get(`/dashboard/stats/${channelId}`);
}
export const getChannelVideos = (params) =>{
 return api.get(`/dashboard/videos`, {params});
}

export const getTopVideosByTimeframes = (channelId) => {
  return api.get(`/dashboard/timeframe/${channelId}`);
};
