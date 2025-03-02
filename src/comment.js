import { Post } from './post'
import { formatDate, formatNumber } from './utils/format'

export class Comment {
  /**
   * @param {Post} post
   * @param {string} id
   * @param {string} kind
   * @param {string} content
   * @param {string} author
   * @param {number} score
   * @param {Comment[]} replies
   * @param {number} timestampSec
   */
  constructor(post, id, kind, content, author, score, replies, timestampSec) {
    this.post = post
    this.id = id
    this.kind = kind
    this.content = content
    this.author = author
    this.score = score
    this.replies = replies
    this.timestampSec = timestampSec
  }

  /**
   * @param {Comment?} parentComment
   */
  getHtmlElements(depth = 0, parentComment) {
    const comment = document.createElement('li')
    comment.className = 'comment'
    comment.style.marginLeft = `${depth}rem`
    if (depth > 0)
      comment.style.borderLeft = `2px solid hsl(${depth * 25}deg 90% 50%)`

    if (this.kind === 'more') {
      comment.innerHTML = `<a href="${parentComment ? `https://www.reddit.com/r/${this.post.subreddit.info.name}/comments/${this.post.id}/comment/${parentComment.id}` : this.post.url}" target="_blank">View more comments on reddit</a>`
      return [comment]
    }

    comment.innerHTML = `
<div>
  <div class="info">
    <div class="author"><a href="https://www.reddit.com/user/${this.author}">u/${this.author}</a></div>
    <div class="time">${formatDate(this.timestampSec)}</div>
  </div>
  <div class="content">${this.content}</div>
</div>
<div class="score">
  <i class="fa-solid fa-angle-up"></i>
  <div>${formatNumber(this.score)}</div>
</div>`

    const elements = [comment]
    if (this.replies.length)
      elements.push(
        ...this.replies.flatMap((comment) =>
          comment.getHtmlElements(depth + 1, this)
        )
      )

    return elements
  }
}
