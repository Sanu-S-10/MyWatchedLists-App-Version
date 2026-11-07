import axios from 'axios';
import { TMDB_API_KEY } from '../config/env';
import {
  TMDBCreditItem,
  TMDBMediaItem,
  TMDBMovieDetails,
  TMDBPerson,
  TMDBSeason,
  TMDBSeriesDetails,
  WatchProvider,
} from '../types/media';

const tmdbClient = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 12000,
});

export const tmdbService = {
  async searchMulti(query: string): Promise<TMDBMediaItem[]> {
    if (!query.trim()) return [];
    const { data } = await tmdbClient.get('/search/multi', {
      params: {
        api_key: TMDB_API_KEY,
        query: query.trim(),
        include_adult: false,
      },
    });
    return (data.results || []).filter(
      (item: TMDBMediaItem) => (item.media_type === 'movie' || item.media_type === 'tv') && (item.title || item.name)
    );
  },

  async searchPerson(query: string): Promise<any[]> {
    if (!query.trim()) return [];
    const { data } = await tmdbClient.get('/search/person', {
      params: {
        api_key: TMDB_API_KEY,
        query: query.trim(),
        include_adult: false,
      },
    });
    return data.results || [];
  },

  async getTrending(mediaType: 'movie' | 'tv' | 'all' = 'all', timeWindow: 'day' | 'week' = 'week'): Promise<TMDBMediaItem[]> {
    try {
      const { data } = await tmdbClient.get(`/trending/${mediaType}/${timeWindow}`, {
        params: { api_key: TMDB_API_KEY },
      });
      return (data.results || []).map((item: TMDBMediaItem) => ({
        ...item,
        media_type: item.media_type || (mediaType === 'all' ? 'movie' : mediaType),
      }));
    } catch {
      return [];
    }
  },

  async getMovieDetails(id: number): Promise<TMDBMovieDetails> {
    const { data } = await tmdbClient.get(`/movie/${id}`, {
      params: {
        api_key: TMDB_API_KEY,
        append_to_response: 'credits',
      },
    });
    return data;
  },

  async getSeriesDetails(id: number): Promise<TMDBSeriesDetails> {
    const { data } = await tmdbClient.get(`/tv/${id}`, {
      params: {
        api_key: TMDB_API_KEY,
        append_to_response: 'credits',
      },
    });
    return data;
  },

  async getSeasonDetails(seriesId: number, seasonNumber: number): Promise<TMDBSeason> {
    const { data } = await tmdbClient.get(`/tv/${seriesId}/season/${seasonNumber}`, {
      params: { api_key: TMDB_API_KEY },
    });
    return data;
  },

  async getPersonDetails(id: number): Promise<{
    person: TMDBPerson;
    credits: TMDBCreditItem[];
    knownFor: TMDBCreditItem[];
  }> {
    const [personRes, creditsRes] = await Promise.all([
      tmdbClient.get(`/person/${id}`, { params: { api_key: TMDB_API_KEY } }),
      tmdbClient.get(`/person/${id}/combined_credits`, { params: { api_key: TMDB_API_KEY } }),
    ]);

    const allCredits: TMDBCreditItem[] = [
      ...(creditsRes.data?.cast || []),
      ...(creditsRes.data?.crew || []),
    ];

    // Deduplicate credits
    const seen = new Set<number>();
    const uniqueCredits: TMDBCreditItem[] = [];
    for (const c of allCredits) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        uniqueCredits.push(c);
      }
    }

    uniqueCredits.sort((a, b) => {
      const dateA = a.release_date || a.first_air_date || '0000-00-00';
      const dateB = b.release_date || b.first_air_date || '0000-00-00';
      return dateB.localeCompare(dateA);
    });

    const knownFor = [...uniqueCredits]
      .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
      .slice(0, 10);

    return {
      person: personRes.data,
      credits: uniqueCredits,
      knownFor,
    };
  },

  async getRecommendations(type: 'movie' | 'tv', id: number): Promise<TMDBMediaItem[]> {
    try {
      const { data } = await tmdbClient.get(`/${type}/${id}/recommendations`, {
        params: { api_key: TMDB_API_KEY },
      });
      return (data.results || []).slice(0, 10).map((r: TMDBMediaItem) => ({ ...r, media_type: type }));
    } catch {
      return [];
    }
  },

  async getWatchProviders(type: 'movie' | 'tv', id: number): Promise<WatchProvider | null> {
    try {
      const { data } = await tmdbClient.get(`/${type}/${id}/watch/providers`, {
        params: { api_key: TMDB_API_KEY },
      });
      const results = data.results || {};
      const regional = results.IN || results.US || Object.values(results)[0];
      if (regional) {
        const provider = regional.flatrate?.[0] || regional.rent?.[0] || regional.buy?.[0];
        if (provider) {
          return {
            provider_id: provider.provider_id,
            provider_name: provider.provider_name,
            logo_path: provider.logo_path,
            link: regional.link,
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  async getVideos(type: 'movie' | 'tv', id: number): Promise<string | null> {
    try {
      const { data } = await tmdbClient.get(`/${type}/${id}/videos`, {
        params: { api_key: TMDB_API_KEY },
      });
      const trailer = (data.results || []).find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      );
      if (trailer?.key) {
        return `https://www.youtube.com/watch?v=${trailer.key}`;
      }
      return null;
    } catch {
      return null;
    }
  },

  async getUpcomingMovies(
    page = 1,
    options?: { genreId?: number; language?: string }
  ): Promise<{ results: TMDBMediaItem[]; totalPages: number }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const params: Record<string, any> = {
        api_key: TMDB_API_KEY,
        'primary_release_date.gte': today,
        sort_by: 'primary_release_date.asc',
        page,
        include_adult: false,
      };
      if (options?.genreId && options.genreId > 0) params.with_genres = options.genreId;
      if (options?.language && options.language.length > 0) params.with_original_language = options.language;

      const { data } = await tmdbClient.get('/discover/movie', { params });
      let results: TMDBMediaItem[] = (data.results || []).map((m: any) => ({ ...m, media_type: 'movie' }));

      // Fallback if discover has 0 results
      if (results.length === 0 && !options?.genreId && !options?.language) {
        const fallback = await tmdbClient.get('/movie/upcoming', { params: { api_key: TMDB_API_KEY, page } });
        results = (fallback.data?.results || []).map((m: any) => ({ ...m, media_type: 'movie' }));
      }

      // Sort ascending by release date
      results.sort((a, b) => {
        const dateA = a.release_date;
        const dateB = b.release_date;
        if (!dateA && !dateB) return 0;
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return dateA!.localeCompare(dateB!);
      });

      return { results, totalPages: data.total_pages || 1 };
    } catch {
      return { results: [], totalPages: 1 };
    }
  },

  async getUpcomingSeries(
    page = 1,
    options?: { genreId?: number; language?: string }
  ): Promise<{ results: TMDBMediaItem[]; totalPages: number }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const params: Record<string, any> = {
        api_key: TMDB_API_KEY,
        'first_air_date.gte': today,
        sort_by: 'first_air_date.asc',
        page,
        include_null_first_air_dates: false,
      };
      if (options?.genreId && options.genreId > 0) params.with_genres = options.genreId;
      if (options?.language && options.language.length > 0) params.with_original_language = options.language;

      const { data } = await tmdbClient.get('/discover/tv', { params });
      let results: TMDBMediaItem[] = (data.results || []).map((m: any) => ({ ...m, media_type: 'tv' }));

      // Fallback to on_the_air if discover is empty
      if (results.length === 0 && !options?.genreId && !options?.language) {
        const fallback = await tmdbClient.get('/tv/on_the_air', { params: { api_key: TMDB_API_KEY, page } });
        results = (fallback.data?.results || []).map((m: any) => ({ ...m, media_type: 'tv' }));
      }

      // Sort ascending by first_air_date
      results.sort((a, b) => {
        const dateA = a.first_air_date;
        const dateB = b.first_air_date;
        if (!dateA && !dateB) return 0;
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return dateA!.localeCompare(dateB!);
      });

      return { results, totalPages: data.total_pages || 1 };
    } catch {
      return { results: [], totalPages: 1 };
    }
  },

  async getUpcomingCombined(limit = 25): Promise<TMDBMediaItem[]> {
    try {
      // 1. Fetch upcoming Malayalam & Tamil (highest priority)
      // 2. Fetch other Indian languages (Hindi, Telugu, Kannada)
      // 3. Fetch English upcoming titles
      const [
        mlMoviesRes,
        taMoviesRes,
        mlTaSeriesRes,
        otherIndianRes,
        enMoviesRes,
        enSeriesRes,
      ] = await Promise.allSettled([
        this.getUpcomingMovies(1, { language: 'ml' }),
        this.getUpcomingMovies(1, { language: 'ta' }),
        this.getUpcomingSeries(1, { language: 'ml|ta' }),
        this.getUpcomingMovies(1, { language: 'hi|te|kn' }),
        this.getUpcomingMovies(1, { language: 'en' }),
        this.getUpcomingSeries(1, { language: 'en' }),
      ]);

      const allItems: TMDBMediaItem[] = [];

      const addResults = (res: PromiseSettledResult<{ results: TMDBMediaItem[] }>) => {
        if (res.status === 'fulfilled' && res.value?.results?.length) {
          allItems.push(...res.value.results);
        }
      };

      addResults(mlMoviesRes);
      addResults(taMoviesRes);
      addResults(mlTaSeriesRes);
      addResults(otherIndianRes);
      addResults(enMoviesRes);
      addResults(enSeriesRes);

      // Deduplicate by ID
      const uniqueMap = new Map<number, TMDBMediaItem>();
      for (const item of allItems) {
        if (item && item.id && !uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      }

      const INDIAN_LANGS = new Set(['ml', 'ta', 'hi', 'te', 'kn', 'bn', 'mr', 'gu', 'pa']);
      const ALLOWED_HOME_LANGS = new Set([...INDIAN_LANGS, 'en']);

      // Filter: Home page only shows Indian and English movies/series
      const filtered = Array.from(uniqueMap.values()).filter((item) => {
        const lang = (item.original_language || '').toLowerCase();
        return ALLOWED_HOME_LANGS.has(lang);
      });

      // Priority ranking: Malayalam & Tamil first (1), other Indian (2), English (3)
      const getPriority = (lang?: string): number => {
        if (!lang) return 3;
        const l = lang.toLowerCase();
        if (l === 'ml' || l === 'ta') return 1; // Highest priority
        if (INDIAN_LANGS.has(l)) return 2;      // Other Indian languages
        if (l === 'en') return 3;              // English
        return 99;                            // Other languages (filtered out)
      };

      filtered.sort((a, b) => {
        const priorityA = getPriority(a.original_language);
        const priorityB = getPriority(b.original_language);

        // 1. Sort by language priority (Malayalam/Tamil first, then other Indian, then English)
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // 2. Within each priority group, sort chronologically ascending by release date
        const dateA = a.release_date || a.first_air_date;
        const dateB = b.release_date || b.first_air_date;
        if (!dateA && !dateB) return 0;
        if (dateA && !dateB) return 1;
        if (!dateA && dateB) return -1;
        return dateA!.localeCompare(dateB!);
      });

      return filtered.slice(0, limit);
    } catch {
      return [];
    }
  },
};
