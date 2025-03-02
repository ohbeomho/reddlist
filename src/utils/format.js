// 숫자 단위 추가
/**
 * @param {number} num
 * @returns string
 */
export function formatNumber(num) {
  if (typeof num !== 'number') return 'NaN'

  let n = 0
  const chars = ['', 'K', 'M', 'B']

  while (true) {
    const newValue = Math.round(num / 100) / 10
    if (newValue < 1) break

    num = newValue
    n++
  }

  return num + chars[n]
}

// 상대적 시간 (n분 전, n시간 전)
/**
 * @param {number} timestampSec
 * @returns string
 */
export function formatDate(timestampSec) {
  if (typeof timestampSec !== 'number') return 'NaN'

  const now = Math.floor(Date.now() / 1000)
  let diff = now - timestampSec,
    n = 0
  const units = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year']
  const div = [60, 60, 24, 7, 30, 12]

  while (true) {
    if (Math.floor(diff / div[n]) < 1) break

    diff = Math.floor(diff / div[n])
    n++
  }

  return `${diff} ${units[n] + (diff > 1 ? 's' : '')} ago`
}

/**
 * @param {string} html
 * @returns string
 */
export function unescapeHtml(html) {
  // 가끔 '&amp;amp;'가 있기 때문에 replaceAll 두 번 호출
  return html
    .replaceAll('&amp;', '&')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replace(/&#0?39;/g, "'")
}
