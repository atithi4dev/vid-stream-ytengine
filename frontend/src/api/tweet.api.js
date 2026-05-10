import api from "./axios";

export const createTweet = (data) =>
  api.post("/tweets", data);

export const getUserTweets = (userId) =>
  api.get(`/tweets/user/${userId}`);

export const updateTweet = (id, data) =>
  api.patch(`/tweets/${id}`, data);

export const deleteTweet = (id) =>
  api.delete(`/tweets/${id}`);
