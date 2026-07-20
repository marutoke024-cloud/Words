// 間隔反復 (Spaced Repetition)
// 登録後 1日 → 3日 → 7日 の間隔で再提示。
// 「まだ未使用」: 次の段階へ進む(最大7日周期で循環し続ける = 忘れた頃に再提示を維持)
// 「使ってみた」: 1回目は30日後に大きく間隔を空け、2回目で復習対象から卒業。

const DAY = 24 * 60 * 60 * 1000;
export const INTERVAL_DAYS = [1, 3, 7];
const GRADUATE_SOFT_DAYS = 30;

/** 新規登録時: 1日後に初回提示 */
export function scheduleInitial(phrase, now = Date.now()) {
  phrase.srs_step = 0;
  phrase.next_review_at = now + INTERVAL_DAYS[0] * DAY;
  return phrase;
}

/** 「まだ未使用」 */
export function markNotUsedYet(phrase, now = Date.now()) {
  phrase.srs_step = Math.min(phrase.srs_step + 1, INTERVAL_DAYS.length - 1);
  phrase.next_review_at = now + INTERVAL_DAYS[phrase.srs_step] * DAY;
  return phrase;
}

/** 「使ってみた」 */
export function markUsed(phrase, now = Date.now()) {
  phrase.used_count = (phrase.used_count || 0) + 1;
  if (phrase.used_count >= 2) {
    phrase.next_review_at = null; // 卒業
  } else {
    phrase.next_review_at = now + GRADUATE_SOFT_DAYS * DAY;
  }
  return phrase;
}
