// Gemini API (gemini-2.5-flash-lite) によるタグ自動提案

const KEY_STORAGE = 'phrase-stock:gemini-key';
const MODEL = 'gemini-2.5-flash-lite';

export const DEFAULT_TAGS = ['話法', '例え', '相槌', '質問術', '切り返し', '導入', '締め', '説得', '雑談', '敬語'];

export function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || '';
}

export function setApiKey(key) {
  if (key) localStorage.setItem(KEY_STORAGE, key.trim());
  else localStorage.removeItem(KEY_STORAGE);
}

/**
 * フレーズ本文からタグ候補を1〜3個提案させる。
 * @returns {Promise<string[]>}
 */
export async function suggestTags(text) {
  const key = getApiKey();
  if (!key) throw new Error('NO_API_KEY');

  const prompt = [
    'あなたは日本語の「言い回しコレクション」を整理するアシスタントです。',
    '次のフレーズに最も合うタグを1〜3個選んでください。',
    `基本タグ候補: ${DEFAULT_TAGS.join(' / ')}`,
    '基本タグで足りない場合のみ、短い新規タグ(6文字以内)を作って構いません。',
    '「親カテゴリ/子カテゴリ」のようにスラッシュで階層化しても構いません。',
    '出力はタグ文字列のJSON配列のみ。説明文は不要です。',
    '',
    `フレーズ: ${text}`,
  ].join('\n');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  let tags;
  try {
    tags = JSON.parse(raw);
  } catch {
    tags = [];
  }
  if (!Array.isArray(tags)) tags = [];
  return tags
    .filter((t) => typeof t === 'string')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
}
