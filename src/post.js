import { Subreddit } from './subreddit'
import { formatNumber, formatDate, unescapeHtml } from './utils/format'
import { getJson } from './utils/request'
import { REDDIT_API } from './subreddit'
import { Comment } from './comment'
import { getScoreHtml } from './utils/score'
import { markdownToHtml } from './utils/markdown'

export class Post {
  /**
   * @param {Subreddit} subreddit
   * @param {string} title
   * @param {string} id
   * @param {string} name
   * @param {string} type
   * @param {Object.<string, any>} content
   * @param {string} author
   * @param {number} commentCount
   * @param {number} score
   * @param {string} thumbnail
   * @param {string} url
   * @param {number} timestampSec
   */
  constructor(
    subreddit,
    title,
    id,
    name,
    type,
    content,
    author,
    commentCount,
    score,
    thumbnail,
    url,
    timestampSec
  ) {
    this.subreddit = subreddit
    this.title = title
    this.id = id
    this.name = name
    this.type = type
    this.content = content
    this.author = author
    this.commentCount = commentCount
    this.score = score
    this.thumbnail = thumbnail
    this.url = url
    this.timestampSec = timestampSec
  }

  async loadComments() {
    if (this.comments) return this.comments

    const jsonData = await getJson(
      `${REDDIT_API}/comments/${this.id}?depth=3&limit=30`
    )
    const comments = jsonData[1]

    const parseComments = (comments) => {
      return comments
        ? comments.data.children.map((comment) => {
            const {
              id,
              body: content,
              author,
              score,
              replies,
              created: timestampSec
            } = comment.data
            return new Comment(
              this,
              id,
              comment.kind,
              markdownToHtml(String(content)),
              author,
              score,
              parseComments(replies),
              timestampSec
            )
          })
        : []
    }

    /** @type {Comment[]} */
    this.comments = parseComments(comments)
  }

  // dialog에 표시될 내용
  getContentHtmlElement() {
    const content = document.createElement('div')
    content.className = 'content'
    const getPostHtml = /** @param {Post} post */ (post) =>
      `<a class="reddit" href="${post.url}" target="_blank"><i class="fa-brands fa-reddit-alien"></i> View on reddit</a>
<h1>${post.title}</h1>
<div class="info">
  <div class="author"><a href="https://www.reddit.com/user/${post.author}" target="_blank">u/${post.author}</a></div>
  <div class="time">${formatDate(post.timestampSec)}</div>
  <div class="post-type">${post.type}</div>
</div>
<div style="font-size: ${post.type === 'crosspost' ? 0.8 : 1}rem">
  ${post.type === 'image' ? `<img src="${post.content.image}" alt="post image" />` : ''}
  ${post.type === 'gallery' ? `${post.content.gallery.map((imageUrl) => `<img src="${imageUrl}" alt="post image" />`).join('')}` : ''}
  ${post.type === 'link' ? `<a href="${post.content.link}" target="_blank">${post.content.link}</a>` : ''}
  ${
    post.type === 'video'
      ? `<video controls>${post.content.video
          .map((videoUrl) => `<source src="${unescapeHtml(videoUrl)}" />`)
          .join('')}</video>`
      : ''
  }
  ${post.type === 'crosspost' ? getPostHtml(post.content.crosspost) : ''}
</div>
${post.content.text ? `<div>${unescapeHtml(post.content.text)}</div>` : ''}
<div class="info">
  ${getScoreHtml(post.score)}
  <div class="comment-count"><i class="fa-solid fa-comment"></i> ${post.commentCount} Comments</div>
</div>`
    content.innerHTML = getPostHtml(this)

    // 이미지, 비디오 크기 조정
    content.querySelectorAll('img,video').forEach((mediaElement) => {
      let loadEvent = 'onload',
        width = 'width',
        height = 'height'
      const node = mediaElement.nodeName.toLowerCase()

      if (node === 'video') {
        loadEvent = 'oncanplay'
        width = 'videoWidth'
        height = 'videoHeight'
      }

      mediaElement[loadEvent] = () => {
        const isWide = mediaElement[width] > mediaElement[height]
        mediaElement.parentElement.style[isWide ? 'width' : 'height'] = isWide
          ? 'calc(100% - 1rem)'
          : this.type === 'gallery'
            ? ''
            : '50vh'
        if (node === 'img')
          mediaElement.style[isWide ? 'width' : 'height'] = isWide
            ? '100%'
            : '50vh'
        else if (node === 'video')
          mediaElement[isWide ? 'width' : 'height'] =
            mediaElement.parentElement[
              isWide ? 'clientWidth' : 'clientHeight'
            ] - parseFloat(getComputedStyle(document.documentElement).fontSize)
      }
    })

    return content
  }

  // Subreddit 목록에 표시될 내용
  getHtmlElement() {
    const post = document.createElement('li')
    post.className = 'post'
    post.onclick = () => this.subreddit.notify('post-open', { post: this })

    post.innerHTML = `
<div class="info">
  <div class="author">u/${this.author}</div>
  <div class="title">${this.title}</div>
  ${this.type !== 'text' ? `<div class="post-type">${this.type}</div>` : ''}
  <div class="comments-time">${formatNumber(this.commentCount)} comments &middot; ${formatDate(this.timestampSec)}</div>
</div>
${getScoreHtml(this.score)}`

    return post
  }
}
