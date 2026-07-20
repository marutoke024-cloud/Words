// YouTube 共有URLの解析 & oEmbed によるメタデータ取得

/** "123" / "123s" / "1h2m3s" / "2m10s" → 秒数 */
export function parseTimeParam(value) {
  if (!value) return null;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  const m = String(value).match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return (parseInt(m[1] || 0, 10) * 3600) + (parseInt(m[2] || 0, 10) * 60) + parseInt(m[3] || 0, 10);
}

/** 秒数 → "1:02:03" / "2:05" */
export function formatTime(sec) {
  if (sec == null) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 共有インテントで渡された title / text / url から YouTube 動画情報を抽出。
 * Android の YouTube アプリは URL を text に入れて共有してくる。
 * @returns {{ videoId: string, url: string, timestampSeconds: number|null } | null}
 */
export function extractYouTubeShare({ title = '', text = '', url = '' } = {}) {
  const haystack = [url, text, title].filter(Boolean).join(' ');
  const urls = haystack.match(/https?:\/\/[^\s]+/g) || [];
  for (const raw of urls) {
    const info = parseYouTubeUrl(raw);
    if (info) return info;
  }
  return null;
}

/** YouTube URL → { videoId, url, timestampSeconds } / 非YouTubeなら null */
export function parseYouTubeUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let videoId = null;

  if (host === 'youtu.be') {
    videoId = u.pathname.slice(1).split('/')[0] || null;
  } else if (host === 'youtube.com' || host === 'music.youtube.com') {
    if (u.pathname === '/watch') {
      videoId = u.searchParams.get('v');
    } else {
      const m = u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{6,})/);
      if (m) videoId = m[1];
    }
  }
  if (!videoId || !/^[\w-]{6,}$/.test(videoId)) return null;

  const timestampSeconds =
    parseTimeParam(u.searchParams.get('t')) ?? parseTimeParam(u.searchParams.get('start'));

  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    timestampSeconds,
  };
}

/** 再生用URL(タイムスタンプ付き) */
export function watchUrl(videoUrl, timestampSeconds) {
  if (!videoUrl) return '';
  if (timestampSeconds == null) return videoUrl;
  const sep = videoUrl.includes('?') ? '&' : '?';
  return `${videoUrl}${sep}t=${timestampSeconds}s`;
}

/**
 * oEmbed で動画タイトル・チャンネル名・サムネイルを自動取得。
 * 失敗時は既知のサムネイルURL規則にフォールバックする。
 */
export async function fetchVideoMeta(videoId, videoUrl) {
  const fallback = {
    title: '',
    channel: '',
    thumbnail_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
  try {
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const res = await fetch(endpoint);
    if (!res.ok) return fallback;
    const data = await res.json();
    return {
      title: data.title || '',
      channel: data.author_name || '',
      thumbnail_url: data.thumbnail_url || fallback.thumbnail_url,
    };
  } catch {
    return fallback;
  }
}
