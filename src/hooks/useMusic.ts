/**
 * Loopd — TanStack Query hooks for music data
 * Handles caching, refetching, pagination, and error states.
 */
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { MusicService } from '../api/musicService';

/** Home screen data: trending tracks */
export function useTrending(limit = 20) {
  return useQuery({
    queryKey: ['trending', limit],
    queryFn: () => MusicService.getTrending(limit),
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000,
  });
}

/** Charts */
export function useCharts(limit = 20) {
  return useQuery({
    queryKey: ['charts', limit],
    queryFn: () => MusicService.getCharts(limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/** New releases */
export function useNewReleases(limit = 20) {
  return useQuery({
    queryKey: ['newReleases', limit],
    queryFn: () => MusicService.getNewReleases(limit),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/** Genres */
export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: () => MusicService.getGenres(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000,
  });
}

/** Popular artists */
export function usePopularArtists(limit = 20) {
  return useQuery({
    queryKey: ['popularArtists', limit],
    queryFn: () => MusicService.getPopularArtists(limit),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/** Search with debounce (use externally debounced query) */
export function useSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => MusicService.search(query, 20),
    enabled: enabled && query.length > 1,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/** Get tracks by genre */
export function useGenreTracks(genre: string, limit = 20) {
  return useQuery({
    queryKey: ['genreTracks', genre, limit],
    queryFn: () => MusicService.getTracksByGenre(genre, limit),
    enabled: !!genre,
    staleTime: 5 * 60 * 1000,
  });
}

/** Get album details */
export function useAlbum(id: string) {
  return useQuery({
    queryKey: ['album', id],
    queryFn: () => MusicService.getAlbum(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

/** Get artist details */
export function useArtist(id: string) {
  return useQuery({
    queryKey: ['artist', id],
    queryFn: () => MusicService.getArtist(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000,
  });
}

/** Get artist tracks */
export function useArtistTracks(id: string, limit = 20) {
  return useQuery({
    queryKey: ['artistTracks', id, limit],
    queryFn: () => MusicService.getArtistTracks(id, limit),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/** Get artist albums */
export function useArtistAlbums(id: string, limit = 20) {
  return useQuery({
    queryKey: ['artistAlbums', id, limit],
    queryFn: () => MusicService.getArtistAlbums(id, limit),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}
