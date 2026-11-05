# Loopd YTMusic & Audio Streaming Backend

Powered by **FastAPI**, **ytmusicapi**, and **yt-dlp**.

## Features
- **YouTube Music Catalog**: Comprehensive Hindi, Bollywood, Punjabi, English, and regional songs.
- **Typo-Tolerant Search & Hinglish**: High accuracy search query matching.
- **Audio Streaming**: Deciphers and streams high-fidelity YouTube audio directly.
- **Continuous Radio / Autoplay**: Provides related recommendations via `/similar/{video_id}`.
- **Trending & Charts**: India (IN) & Global charts.

---

## Render Deployment Instructions (Free & 1-Click)

1. Create a free account at [render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository (or use Public Git repository).
4. Configure the Web Service settings:
   - **Name**: `loopd-ytmusic-api` (or any name you like)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
5. Click **Create Web Service**.
6. Once deployed, Render will give you a public URL like:
   `https://loopd-ytmusic-api.onrender.com`
7. Copy that URL and paste it in `Loopd`'s `.env` as:
   `EXPO_PUBLIC_YTMUSIC_API_URL=https://loopd-ytmusic-api.onrender.com`

---

## Running Locally

To run locally on your computer:
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
The API will run on `http://localhost:8000`.

