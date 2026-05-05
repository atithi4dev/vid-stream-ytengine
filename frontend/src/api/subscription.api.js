import api from "./axios";

export const getSubscribedChannels = (subscriberId) => {
  return api.get(`/subscriptions/u/${subscriberId}`);
};

export const getUserChannelSubscribers = (channelId) => {
  return api.get(`/subscriptions/c/${channelId}`);
};

export const toggleSubscription = (channelId) => {
  return api.post(`/subscriptions/c/${channelId}`);
};
