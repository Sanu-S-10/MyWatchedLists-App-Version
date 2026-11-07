export type MediaType = 'movie' | 'series';
export type SubType = 'anime' | 'animation' | 'documentary' | 'live_action';

export interface Genre {
  id: number;
  name: string;
}

export interface SeasonWatched {
  seasonNumber: number;
  episodesWatched: number[];
}

export interface WatchItem {
  _id: string;
  user: string;
  tmdbId: number;
  mediaType: MediaType;
  subType: SubType;
  status?: 'watched' | 'watch_later';
  title: string;
  posterPath?: string;
  originCountry?: string;
  releaseDate?: string;
  genres: Genre[];
  rating: number; // 0-5
  userNotes?: string;
  isFavorite: boolean;
  watchDate?: string | null;
  lastWatchedDate?: string;
  isUnknownDate?: boolean;
  watchTimeMinutes: number;
  runtime?: number; // minutes for movie
  seasons?: number; // total seasons for series
  episodes?: number; // watched episodes count for series
  episodeDuration?: number; // average episode runtime in minutes
  watchedSeasons?: number[];
  watchedEpisodes?: string[]; // e.g. ["S1E1", "S1E2"]
  seasonsWatched?: SeasonWatched[];
  hasNewSeasonReleased?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWatchItemPayload {
  tmdbId: number;
  mediaType: MediaType;
  subType?: SubType;
  status?: 'watched' | 'watch_later';
  title: string;
  posterPath?: string;
  originCountry?: string;
  releaseDate?: string;
  genres?: Genre[];
  rating?: number;
  userNotes?: string;
  isFavorite?: boolean;
  watchDate?: string | null;
  isUnknownDate?: boolean;
  watchTimeMinutes?: number;
  runtime?: number;
  seasons?: number;
  episodes?: number;
  episodeDuration?: number;
  watchedSeasons?: number[];
  watchedEpisodes?: string[];
  seasonsWatched?: SeasonWatched[];
}

export interface UpdateWatchItemPayload {
  status?: 'watched' | 'watch_later';
  rating?: number;
  userNotes?: string;
  isFavorite?: boolean;
  watchDate?: string | null;
  isUnknownDate?: boolean;
  watchedSeasons?: number[];
  watchedEpisodes?: string[];
  seasonsWatched?: SeasonWatched[];
  watchTimeMinutes?: number;
  episodes?: number;
}

export const isMediaWatched = (item: WatchItem): boolean => {
  if (item.status === 'watch_later') return false;
  if (item.status === 'watched') return true;
  if (typeof item.rating === 'number' && item.rating > 0) return true;
  if (typeof item.watchTimeMinutes === 'number' && item.watchTimeMinutes > 0) return true;
  if (Array.isArray(item.watchedEpisodes) && item.watchedEpisodes.length > 0) return true;
  if (typeof item.episodes === 'number' && item.episodes > 0) return true;
  if (Array.isArray(item.seasonsWatched) && item.seasonsWatched.some((s) => s.episodesWatched?.length > 0)) return true;
  return false;
};

export const isMediaWatchLater = (item: WatchItem): boolean => {
  return !isMediaWatched(item);
};

export interface TMDBMediaItem {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  origin_country?: string[];
  original_language?: string;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview?: string;
  episode_number: number;
  season_number: number;
  air_date?: string;
  runtime?: number;
  still_path?: string | null;
  vote_average?: number;
}

export interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date?: string;
  poster_path?: string | null;
  overview?: string;
  episodes?: TMDBEpisode[];
}

export interface TMDBCastPerson {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
}

export interface TMDBCrewPerson {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path?: string | null;
}

export type TMDBCastMember = TMDBCastPerson;
export type TMDBCrewMember = TMDBCrewPerson;

export interface TMDBMovieDetails {
  id: number;
  title: string;
  tagline?: string;
  overview: string;
  release_date: string;
  runtime: number;
  status: string;
  vote_average: number;
  vote_count: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres: Genre[];
  budget?: number;
  revenue?: number;
  original_language: string;
  production_companies?: { id: number; name: string; logo_path?: string | null }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  homepage?: string;
  credits?: {
    cast: TMDBCastPerson[];
    crew: TMDBCrewPerson[];
  };
}

export interface TMDBSeriesDetails {
  id: number;
  name: string;
  tagline?: string;
  overview: string;
  first_air_date: string;
  last_air_date?: string;
  status: string;
  vote_average: number;
  vote_count: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres: Genre[];
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time?: number[];
  original_language: string;
  origin_country?: string[];
  seasons: TMDBSeason[];
  production_companies?: { id: number; name: string; logo_path?: string | null }[];
  homepage?: string;
  credits?: {
    cast: TMDBCastPerson[];
    crew: TMDBCrewPerson[];
  };
}

export interface TMDBPerson {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  place_of_birth?: string;
  profile_path?: string | null;
  known_for_department?: string;
  homepage?: string;
}

export interface TMDBCreditItem {
  id: number;
  credit_id?: string;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  character?: string;
  job?: string;
  department?: string;
  vote_count?: number;
  vote_average?: number;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  link?: string;
}
