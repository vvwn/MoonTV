const TMDB_BASE_URL =
  process.env.TMDB_API_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL =
  process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w500';

interface TmdbSearchItem {
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
}

interface TmdbSearchResponse {
  results?: TmdbSearchItem[];
}

function normalizeYear(input?: string): string {
  if (!input) return '';
  return input.match(/\d{4}/)?.[0] || '';
}

function buildTmdbPosterUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${TMDB_IMAGE_BASE_URL}${path}`;
}

function getTmdbApiKey(): string {
  return process.env.TMDB_API_KEY || '';
}

export async function getPosterFromTmdb(
  title: string,
  year?: string
): Promise<string> {
  const apiKey = getTmdbApiKey();
  if (!apiKey || !title.trim()) {
    return '';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const targetUrl = `${TMDB_BASE_URL}/search/multi?api_key=${encodeURIComponent(
    apiKey
  )}&query=${encodeURIComponent(
    title.trim()
  )}&include_adult=false&language=zh-CN`;

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return '';
    }

    const data = (await response.json()) as TmdbSearchResponse;
    const list = Array.isArray(data.results) ? data.results : [];
    if (!list.length) {
      return '';
    }

    const normalizedYear = normalizeYear(year);
    const exactYearItem = normalizedYear
      ? list.find((item) => {
          const itemYear = normalizeYear(
            item.release_date || item.first_air_date || ''
          );
          return item.poster_path && itemYear === normalizedYear;
        })
      : undefined;

    const bestItem = exactYearItem || list.find((item) => !!item.poster_path);
    if (!bestItem?.poster_path) {
      return '';
    }

    return buildTmdbPosterUrl(bestItem.poster_path);
  } catch (error) {
    clearTimeout(timeoutId);
    return '';
  }
}
