# Video Streaming Platform - Backend Module

**YT-ENGINE** is a backend-driven video streaming platform that supports uploading, transcoding, and serving videos in multiple resolutions using HLS. It is built with a modular architecture to handle channels, subscriptions, playlists, and user engagement efficiently.

---

## Guides

~ [**Documentation**](https://yt.veren.site/docs)

~ [**API Walkthrough**](https://yt.veren.site/api-walkthrough)

~ [**Quick Setup**](#project-setup)

~ [**By me a coffee**](https://main.veren.site/coffee)

---

## Project Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd yt-engine
```

2. Ensure all required configuration files are added (database credentials, S3 settings, etc.).

3. Start the services using Docker Compose:

```bash
docker compose up --build
```

Once running, you can explore API routes and features through the API documentation.

---

## Architecture Overview

YT-ENGINE is designed as a **service-oriented backend** for video streaming:

* **API Gateway** – Central entry point for all requests (video, channel, user, subscription).
* **Worker Services** – Handle video transcoding, chunking, and background tasks via BullMQ.
* **Artifact Storage** – Videos are stored in S3 and served as HLS streams (`.m3u8` + `.ts` chunks).
* **Database Layer** – Tracks users, videos, playlists, subscriptions, and watch history.
* **Asynchronous Event Flow** – Ensures reliable processing of uploads, encodings, and notifications.

---

## Features

### User Module

* Register/login with profile images.
* Update account details and password.
* Fetch user profile, watch history, and uploaded videos.

### Video Module

* Upload videos and thumbnails.
* Transcode videos into multiple resolutions using ffmpeg.
* Generate HLS streams (`.m3u8` playlists + `.ts` chunks).
* Fetch, update, or delete videos.

### Playlist & Subscription

* Create, update, and delete playlists.
* Add/remove videos from playlists.
* Subscribe/unsubscribe to channels.

### Engagement

* Comment on videos with CRUD operations.
* Like/unlike videos and comments.
* Fetch channel stats (views, subscribers).

### Health Check

* API status available at `/api/healthcheck`.

---

## Roadmap / Upcoming Features

* Adaptive bitrate streaming via HLS (handled by HLS.js).
* Private video access control and permissions.
* Background encoding for additional resolutions.
* Analytics and engagement metrics (views, watch time).
* WebSocket support for live comments and notifications.

---

## Contributions

YT-ENGINE is an experimental backend project. Contributions and feedback are welcome:

* Open an issue for bugs or feature requests.
* Submit pull requests for improvements.
* Focus on clarity and intent; perfection is not required.

---

## Support

* Open an issue on the [GitHub repository](https://github.com/atithi4dev/vid-stream-ytengine/issues).
* Reach out via [email](atithisingh.dev@gmail.com) or discussion forums for help.


</br>
</br>
</br>
</br>
</br>
</br>
