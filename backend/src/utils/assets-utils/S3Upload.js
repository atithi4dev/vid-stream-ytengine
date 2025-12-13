const updateS3VideoHls = async (hlsPath, videoId, masterUrl) => {
  // TODO: Replace with actual S3 upload logic

  const fakeS3BaseUrl = "https://fake-s3-bucket.s3.amazonaws.com";

  return {
    hlsS3Path: `${fakeS3BaseUrl}/${videoId}/hls`,
    videoId: videoId,
    masterUrl: `${fakeS3BaseUrl}/${videoId}/hls/master.m3u8`,
  };
};

export { updateS3VideoHls };
