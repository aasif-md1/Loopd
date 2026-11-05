"""
Loopd YTMusic & Streaming Backend
Powered by ytmusicapi & yt-dlp
Provides high-performance music search, metadata, trending charts, and high-fidelity audio streams.
"""

import time
import os
import requests
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse
from ytmusicapi import YTMusic
import yt_dlp

app = FastAPI(
    title="Loopd YTMusic API",
    description="High-performance YouTube Music streaming and search backend for Loopd",
    version="1.0.0",
)

# Enable CORS for Mobile, Web, and Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize anonymous YTMusic client
ytmusic = YTMusic()

# High-reliability Invidious instances for datacenter-safe audio extraction
INVIDIOUS_INSTANCES = [
    "https://yt.chocolatemoo53.com",
    "https://invidious.nerdvpn.de",
    "https://inv.nadeko.net",
    "https://invidious.tiekoetter.com",
]

# In-memory stream URL cache: video_id -> (stream_url, expiry_timestamp)
# YouTube CDN URLs typically expire in ~6 hours; we cache for 2 hours (7200s).
STREAM_CACHE: Dict[str, tuple[str, float]] = {}
CACHE_TTL = 7200

# yt-dlp extraction options optimized for fast audio-only URL retrieval
YDL_OPTS = {
    "format": "bestaudio[ext=m4a]/bestaudio/best",
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "extract_flat": False,
    "socket_timeout": 10,
    "nocheckcertificate": True,
}


def get_hd_artwork(thumbnails: Optional[List[Dict[str, Any]]]) -> Optional[str]:
    """Extract and upgrade highest resolution thumbnail."""
    if not thumbnails:
        return None
    # Pick the largest thumbnail available
    best = thumbnails[-1].get("url", "")
    if not best:
        return None
    # Upgrade common YouTube Music thumbnail sizes to high-res (w544-h544 or s500)
    best = best.replace("=w60-h60", "=w544-h544")
    best = best.replace("=w120-h120", "=w544-h544")
    best = best.replace("=s60", "=s500")
    best = best.replace("=s120", "=s500")
    if best.startswith("http://"):
        best = "https://" + best[7:]
    return best


def parse_duration(duration_str: Optional[Any]) -> int:
    """Parse duration in MM:SS, HH:MM:SS or integer seconds."""
    if not duration_str:
        return 0
    if isinstance(duration_str, (int, float)):
        return int(duration_str)
    try:
        parts = str(duration_str).split(":")
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        return int(parts[0])
    except Exception:
        return 0


def map_track(item: Dict[str, Any], base_url: str = "") -> Optional[Dict[str, Any]]:
    """Transform YTMusic track item into unified Loopd Track shape."""
    video_id = item.get("videoId")
    if not video_id:
        return None

    # Title
    title = item.get("title", "Unknown Track")

    # Artist(s)
    artists_raw = item.get("artists") or []
    if isinstance(artists_raw, list) and len(artists_raw) > 0:
        artist_names = [a.get("name", "") for a in artists_raw if isinstance(a, dict) and a.get("name")]
        artist = ", ".join(artist_names) if artist_names else "Unknown Artist"
        primary_artist_id = artists_raw[0].get("id") if isinstance(artists_raw[0], dict) else None
    elif isinstance(artists_raw, str):
        artist = artists_raw
        primary_artist_id = None
    else:
        artist = "Unknown Artist"
        primary_artist_id = None

    # Album
    album_obj = item.get("album")
    if isinstance(album_obj, dict):
        album = album_obj.get("name")
        album_id = album_obj.get("id")
    elif isinstance(album_obj, str):
        album = album_obj
        album_id = None
    else:
        album = None
        album_id = None

    # Duration
    duration = item.get("duration_seconds")
    if duration is None:
        duration = parse_duration(item.get("duration"))

    artwork = get_hd_artwork(item.get("thumbnails"))

    return {
        "id": f"ytmusic-{video_id}",
        "title": title,
        "artist": artist,
        "artistId": f"ytmusic-{primary_artist_id}" if primary_artist_id else None,
        "album": album,
        "albumId": f"ytmusic-{album_id}" if album_id else None,
        "duration": int(duration) if duration else 0,
        "artwork": artwork,
        "streamUrl": f"/stream/{video_id}",
        "provider": "ytmusic",
        "isExplicit": bool(item.get("isExplicit", False)),
        "releaseDate": item.get("year"),
        "previewOnly": False,
    }


def extract_audio_url(video_id: str) -> str:
    """Extract high-quality direct audio CDN stream URL with multi-tier fallback and caching."""
    now = time.time()
    cached = STREAM_CACHE.get(video_id)
    if cached:
        url, exp = cached
        if exp > now:
            return url

    # Tier 1: Try trusted Invidious instances (completely immune to datacenter bot wall)
    for inst in INVIDIOUS_INSTANCES:
        try:
            resp = requests.get(f"{inst}/api/v1/videos/{video_id}", timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                formats = data.get("adaptiveFormats", [])
                audio_formats = [f for f in formats if "audio" in f.get("type", "") and f.get("url")]
                if audio_formats:
                    # Prefer m4a / mp4 (AAC audio) for universal native playback on Android, iOS, Windows, and Web
                    m4a_formats = [
                        f for f in audio_formats
                        if "mp4" in f.get("type", "").lower() or "m4a" in f.get("container", "").lower()
                    ]
                    candidates = m4a_formats if m4a_formats else audio_formats
                    candidates.sort(key=lambda x: int(x.get("bitrate", 0)), reverse=True)
                    raw_url = candidates[0].get("url")
                    if raw_url:
                        # Route through Invidious server proxy so IP matches and YouTube CDN returns 200/206
                        from urllib.parse import urlparse, urlunparse
                        parsed = urlparse(raw_url)
                        inst_parsed = urlparse(inst)
                        stream_url = urlunparse((inst_parsed.scheme, inst_parsed.netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
                        STREAM_CACHE[video_id] = (stream_url, now + CACHE_TTL)
                        return stream_url
        except Exception as e:
            print(f"[Invidious Tier 1 error on {inst}] {e}")

    # Tier 2: Try yt-dlp with mobile clients (works on residential IPs, proxies, or if cookies supplied)
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    mobile_opts = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": False,
        "socket_timeout": 10,
        "nocheckcertificate": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["ios", "android", "mweb"]
            }
        }
    }

    try:
        with yt_dlp.YoutubeDL(mobile_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if info:
                stream_url = info.get("url")
                if not stream_url and "formats" in info:
                    audio_formats = [
                        f for f in info["formats"]
                        if f.get("acodec") != "none" and (f.get("vcodec") == "none" or f.get("format_note") == "tiny")
                    ]
                    if audio_formats:
                        audio_formats.sort(key=lambda x: x.get("abr") or x.get("tbr") or 0, reverse=True)
                        stream_url = audio_formats[0].get("url")
                if stream_url:
                    STREAM_CACHE[video_id] = (stream_url, now + CACHE_TTL)
                    return stream_url
    except Exception as e:
        print(f"[YTMusic Tier 2 yt-dlp mobile error] {e}")

    # Tier 3: Try ytmusic.get_song direct format URL
    try:
        song_data = ytmusic.get_song(video_id)
        streaming_data = song_data.get("streamingData", {}) if isinstance(song_data, dict) else {}
        formats = streaming_data.get("adaptiveFormats", []) + streaming_data.get("formats", [])
        audio_formats = [f for f in formats if "audio" in f.get("mimeType", "") and f.get("url")]
        if audio_formats:
            audio_formats.sort(key=lambda x: x.get("bitrate", 0), reverse=True)
            stream_url = audio_formats[0].get("url")
            if stream_url:
                STREAM_CACHE[video_id] = (stream_url, now + CACHE_TTL)
                return stream_url
    except Exception as e:
        print(f"[YTMusic Tier 3 get_song error] {e}")

    raise HTTPException(status_code=500, detail="Could not extract audio stream from any available source")


@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "Loopd YTMusic Audio API",
        "cached_streams": len(STREAM_CACHE),
    }


@app.get("/stream/{video_id}")
def stream(video_id: str, request: Request):
    """
    Proxy high-fidelity audio stream directly through Render.
    Bypasses YouTube CDN IP-locking (which throws 403 Forbidden on mobile/desktop clients).
    Supports HTTP Range requests for seeking and fast buffering.
    """
    clean_id = video_id.replace("ytmusic-", "")
    stream_url = extract_audio_url(clean_id)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    range_header = request.headers.get("range")
    if range_header:
        headers["Range"] = range_header

    try:
        resp = requests.get(stream_url, headers=headers, stream=True, timeout=20)
    except Exception:
        STREAM_CACHE.pop(clean_id, None)
        stream_url = extract_audio_url(clean_id)
        resp = requests.get(stream_url, headers=headers, stream=True, timeout=20)

    if resp.status_code not in (200, 206):
        STREAM_CACHE.pop(clean_id, None)
        stream_url = extract_audio_url(clean_id)
        resp = requests.get(stream_url, headers=headers, stream=True, timeout=20)

    response_headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": resp.headers.get("Content-Type", "audio/mp4"),
    }
    for h in ("Content-Length", "Content-Range", "Cache-Control"):
        if h in resp.headers:
            response_headers[h] = resp.headers[h]

    def iter_stream():
        try:
            for chunk in resp.iter_content(chunk_size=65536):
                if chunk:
                    yield chunk
        finally:
            resp.close()

    return StreamingResponse(
        iter_stream(),
        status_code=resp.status_code,
        headers=response_headers,
    )


@app.get("/stream-url/{video_id}")
def stream_url(video_id: str, request: Request):
    """Return JSON containing proxy stream URL for clients."""
    clean_id = video_id.replace("ytmusic-", "")
    base = str(request.base_url).rstrip("/")
    return {
        "streamUrl": f"{base}/stream/{clean_id}",
        "videoId": clean_id,
    }


@app.get("/search")
def search(q: str = Query(..., min_length=1), limit: int = 20):
    """
    Search songs, artists, and albums with typo-tolerance and Hinglish support.
    """
    try:
        songs = ytmusic.search(q, filter="songs", limit=limit)
    except Exception:
        songs = []

    try:
        artists_res = ytmusic.search(q, filter="artists", limit=8)
    except Exception:
        artists_res = []

    try:
        albums_res = ytmusic.search(q, filter="albums", limit=8)
    except Exception:
        albums_res = []

    tracks: List[Dict[str, Any]] = []
    for item in songs:
        t = map_track(item)
        if t:
            tracks.append(t)

    artists = []
    for item in artists_res:
        browse_id = item.get("browseId")
        if browse_id:
            artists.append({
                "id": f"ytmusic-{browse_id}",
                "name": item.get("artist", "Unknown"),
                "image": get_hd_artwork(item.get("thumbnails")),
                "provider": "ytmusic",
            })

    albums = []
    for item in albums_res:
        browse_id = item.get("browseId")
        if browse_id:
            artists_list = item.get("artists") or []
            artist_name = ", ".join([a.get("name", "") for a in artists_list if isinstance(a, dict)]) or "Unknown"
            albums.append({
                "id": f"ytmusic-{browse_id}",
                "title": item.get("title", "Unknown Album"),
                "artist": artist_name,
                "artwork": get_hd_artwork(item.get("thumbnails")),
                "releaseDate": item.get("year"),
                "provider": "ytmusic",
            })

    return {
        "tracks": tracks,
        "artists": artists,
        "albums": albums,
        "playlists": [],
    }


@app.get("/suggestions")
def suggestions(q: str = Query(..., min_length=1)):
    """Auto-complete search suggestions from YouTube Music."""
    try:
        results = ytmusic.get_search_suggestions(q)
        return {"suggestions": results}
    except Exception as e:
        return {"suggestions": []}


@app.get("/trending")
@app.get("/charts")
def get_charts(limit: int = 30, country: str = "IN"):
    """
    Get top charts & trending tracks. Defaults to India (IN).
    """
    tracks: List[Dict[str, Any]] = []
    try:
        charts = ytmusic.get_charts(country=country)
        # Charts contains 'videos' or 'songs'
        chart_items = charts.get("videos", {}).get("items", []) or charts.get("songs", {}).get("items", [])
        for item in chart_items[:limit]:
            t = map_track(item)
            if t:
                tracks.append(t)
    except Exception as e:
        print(f"[YTMusic] Failed to get charts: {e}")

    # Fallback to search trending hits if charts endpoint had an issue
    if not tracks:
        try:
            fallback = ytmusic.search("Trending Hits India", filter="songs", limit=limit)
            for item in fallback:
                t = map_track(item)
                if t:
                    tracks.append(t)
        except Exception:
            pass

    return tracks


@app.get("/new-releases")
def new_releases(limit: int = 20):
    """Get new release albums and singles."""
    albums: List[Dict[str, Any]] = []
    try:
        explore = ytmusic.get_explore()
        new_items = explore.get("new_releases", {}).get("items", [])
        for item in new_items[:limit]:
            browse_id = item.get("browseId")
            if browse_id:
                artists_list = item.get("artists") or []
                artist_name = ", ".join([a.get("name", "") for a in artists_list if isinstance(a, dict)]) or "Unknown"
                albums.append({
                    "id": f"ytmusic-{browse_id}",
                    "title": item.get("title", "New Release"),
                    "artist": artist_name,
                    "artwork": get_hd_artwork(item.get("thumbnails")),
                    "releaseDate": item.get("year"),
                    "provider": "ytmusic",
                })
    except Exception as e:
        print(f"[YTMusic] Failed to get new releases: {e}")

    return albums


@app.get("/similar/{video_id}")
def similar(video_id: str, limit: int = 20):
    """
    Continuous playback / radio: fetch watch playlist tracks for a given video_id.
    """
    clean_id = video_id.replace("ytmusic-", "")
    tracks: List[Dict[str, Any]] = []
    try:
        watch = ytmusic.get_watch_playlist(videoId=clean_id, limit=limit)
        items = watch.get("tracks", [])
        for item in items:
            # Skip the current song itself
            if item.get("videoId") == clean_id:
                continue
            t = map_track(item)
            if t:
                tracks.append(t)
    except Exception as e:
        print(f"[YTMusic] get_watch_playlist failed: {e}")

    return tracks


@app.get("/artist/{artist_id}")
def get_artist(artist_id: str):
    """Get artist profile, top tracks, and albums."""
    clean_id = artist_id.replace("ytmusic-", "")
    try:
        data = ytmusic.get_artist(clean_id)
        artist_obj = {
            "id": f"ytmusic-{clean_id}",
            "name": data.get("name", "Unknown Artist"),
            "image": get_hd_artwork(data.get("thumbnails")),
            "bio": data.get("description"),
            "provider": "ytmusic",
        }

        top_tracks = []
        songs_data = data.get("songs", {}).get("results", [])
        for item in songs_data:
            t = map_track(item)
            if t:
                top_tracks.append(t)

        albums = []
        albums_data = data.get("albums", {}).get("results", [])
        for item in albums_data:
            browse_id = item.get("browseId")
            if browse_id:
                albums.append({
                    "id": f"ytmusic-{browse_id}",
                    "title": item.get("title", ""),
                    "artist": artist_obj["name"],
                    "artwork": get_hd_artwork(item.get("thumbnails")),
                    "releaseDate": item.get("year"),
                    "provider": "ytmusic",
                })

        return {
            "artist": artist_obj,
            "tracks": top_tracks,
            "albums": albums,
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Artist not found: {str(e)}")


@app.get("/album/{album_id}")
def get_album(album_id: str):
    """Get album details and track list."""
    clean_id = album_id.replace("ytmusic-", "")
    try:
        data = ytmusic.get_album(clean_id)
        artwork = get_hd_artwork(data.get("thumbnails"))
        artist_name = ""
        artists_list = data.get("artists") or []
        if artists_list:
            artist_name = ", ".join([a.get("name", "") for a in artists_list if isinstance(a, dict)])

        tracks = []
        for item in data.get("tracks", []):
            t = map_track(item)
            if t:
                if not t.get("artwork"):
                    t["artwork"] = artwork
                tracks.append(t)

        album_obj = {
            "id": f"ytmusic-{clean_id}",
            "title": data.get("title", "Unknown Album"),
            "artist": artist_name,
            "artwork": artwork,
            "releaseDate": data.get("year"),
            "trackCount": len(tracks),
            "tracks": tracks,
            "provider": "ytmusic",
        }
        return album_obj
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Album not found: {str(e)}")


@app.get("/playlist/{playlist_id}")
def get_playlist(playlist_id: str):
    """Get playlist details and tracks."""
    clean_id = playlist_id.replace("ytmusic-", "")
    try:
        data = ytmusic.get_playlist(clean_id)
        artwork = get_hd_artwork(data.get("thumbnails"))
        tracks = []
        for item in data.get("tracks", []):
            t = map_track(item)
            if t:
                tracks.append(t)

        return {
            "id": f"ytmusic-{clean_id}",
            "title": data.get("title", "Unknown Playlist"),
            "description": data.get("description"),
            "artwork": artwork,
            "trackCount": len(tracks),
            "tracks": tracks,
            "provider": "ytmusic",
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Playlist not found: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

