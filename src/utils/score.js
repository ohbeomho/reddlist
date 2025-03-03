import { formatNumber } from './format'

export const getScoreHtml = /** @param {number} score  */ (score) => {
  return `<div class="score ${score < 0 ? 'negative' : 'positive'}">
  <i class="fa-solid ${score < 0 ? 'fa-angle-down' : 'fa-angle-up'}"></i>
  <div>${formatNumber(Math.abs(score))}</div>
</div>`
}
