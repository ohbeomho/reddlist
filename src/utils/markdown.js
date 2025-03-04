import markdownit from 'markdownit'

const md = markdownit({
  html: true,
  linkify: true,
  typographer: true
})

export function markdownToHtml(markdownText) {
  return md.render(markdownText)
}
