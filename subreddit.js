export const baseURL = 'https://api.reddit.com'

// 1000 -> 1K
// 1000000 -> 1M
// 1000000000 -> 1B
function formatNumber(num) {
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

// Relative time format
function formatDate(timestampSec) {
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

export class Subreddit {
  constructor(name, icon, banner, sort) {
    this.info = { name, icon, banner }
    this.sort = sort
    this.posts = []
    this.htmlElement = null
    this.listeners = {
      'fetch-start': [],
      'fetch-info-start': [],
      'fetch-info-finish': [],
      'fetch-post-start': [],
      'fetch-post-finish': [],
      'fetch-finish': [],
      remove: [],
      'sort-change': [],
      'html-load': [],
      'post-open': []
    }
    this.args = {
      'fetch-start': [],
      'fetch-info-start': [],
      'fetch-info-finish': [],
      'fetch-post-start': [],
      'fetch-post-finish': [],
      'fetch-finish': ['info'],
      remove: [],
      'sort-change': ['sort'],
      'html-load': [],
      'post-open': ['post']
    }
  }

  getData() {
    return { name: this.info.name, sort: this.sort }
  }

  notify(event, args) {
    this.listeners[event]?.forEach((listener) => {
      listener(...this.args[event].map((argName) => args[argName]))

      if (listener.once) this.removeListener(listener)
    })
  }

  on(event, listener) {
    this.listeners[event]?.push(listener)
  }

  once(event, listener) {
    listener.once = true
    this.listeners[event]?.push(listener)
  }

  removeListener(event, listener) {
    if (!this.listeners[event] || !this.listeners.includes(listener)) return

    this.listeners[event].splice(this.listeners[event].indexOf(listener), 1)
  }

  async fetchPosts(after) {
    this.notify('fetch-post-start')

    if (!after) this.posts = []

    const response = await fetch(
      `${baseURL}/r/${this.info.name}/${this.sort}${after ? `?after=${after}` : ''}`
    )
    const parsed = await response.json()

    this.posts.push(
      ...parsed.data.children.map((post) => {
        const {
          title,
          id,
          selftext_html: text,
          author,
          num_comments: commentCount,
          score,
          thumbnail,
          created: timestampSec,
          post_hint,
          is_gallery,
          is_video,
          poll_data,
          crosspost_parent,
          is_self,
          media,
          permalink,
          name
        } = post.data

        let type = 'link'
        if (post_hint === 'image') type = 'image'
        else if (is_gallery) type = 'gallery'
        else if (is_video) type = 'video'
        else if (poll_data) type = 'poll'
        else if (crosspost_parent) type = 'crosspost'
        else if (is_self) type = 'text'

        return new Post(
          this,
          title,
          id,
          name,
          type,
          {
            text,
            image: type === 'image' ? post.data.url_overridden_by_dest : null,
            video: type === 'video' ? media.reddit_video.fallback_url : null
            // TODO: Add other content based on type
          },
          author,
          commentCount,
          score,
          thumbnail,
          `https://www.reddit.com${permalink}`,
          timestampSec
        )
      })
    )

    this.notify('fetch-post-finish')
  }

  async fetchInfo() {
    this.notify('fetch-info-start')

    const response = await fetch(`${baseURL}/r/${this.info.name}/about`)
    const parsed = await response.json()
    const {
      display_name: name,
      public_description: desc,
      banner_background_image: banner,
      community_icon: icon
    } = parsed.data

    Object.assign(this.info, {
      name,
      desc,
      banner,
      icon: icon || parsed.data.icon_img
    })

    this.notify('fetch-info-finish')
  }

  async fetchData() {
    this.notify('fetch-start')

    try {
      await this.fetchPosts()
      await this.fetchInfo()
    } catch (err) {
      this.err = err
    } finally {
      this.notify('fetch-finish', { info: this.info })
    }
  }

  remove() {
    this.htmlElement.remove()
    this.notify('remove')
  }

  getHTMLElement() {
    this.htmlElement = document.createElement('div')
    this.htmlElement.classList.add('subreddit')

    const removeButton = document.createElement('button')
    removeButton.className = 'remove'
    removeButton.innerText = 'Remove'
    removeButton.onclick = () => this.remove()

    if (this.err) {
      this.htmlElement.innerHTML = `
<div class="error">
  Error loading:
  <br />
  <b>r/${this.info.name}</b>
</div>
<div class="error-message">${this.err}</div>`
      this.htmlElement.appendChild(removeButton)
      return this.htmlElement
    }

    this.htmlElement.innerHTML = `
${this.info.banner ? `<div class="banner" style="background-image: url(${this.info.banner})"></div>` : ''}
<div class="info">
  ${
    this.info.icon
      ? `<img class="icon" src="${this.info.icon}" alt="r/" />`
      : `<div class="icon">r/</div>`
  }
  <a class="name" href="https://www.reddit.com/r/${this.info.name}" target="_blank">r/${this.info.name}</a>
</div>`

    const fetchButton = document.createElement('button')
    fetchButton.innerHTML = '<i class="fa-solid fa-rotate-right"></i>'
    fetchButton.className = 'fetch'
    fetchButton.onclick = () => this.fetchData()
    this.htmlElement.appendChild(fetchButton)

    const loadingSpinner = document.createElement('div')
    loadingSpinner.className = 'loading'
    loadingSpinner.innerHTML = '<i class="fa-solid fa-spinner"></i>'

    const menu = document.createElement('div')
    menu.className = 'menu'
    menu.appendChild(removeButton)

    const menuButton = document.createElement('button')
    menuButton.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>'
    menuButton.className = 'menu'
    menuButton.appendChild(menu)
    menuButton.onclick = (e) => {
      if (menu.classList.contains('open')) menu.close()
      else menu.open()
      e.stopPropagation()
    }

    this.htmlElement.querySelector('.info').appendChild(menuButton)

    menu.open = () => menu.classList.add('open')
    menu.close = () => menu.classList.remove('open')

    this.once('fetch-start', () => {
      this.htmlElement.appendChild(loadingSpinner)
      fetchButton.remove()
    })
    this.once('fetch-finish', () => {
      this.htmlElement.classList.add('loaded')
      loadingSpinner.remove()

      this.htmlElement.innerHTML = `
${this.info.banner ? `<div class="banner" style="background-image: url(${this.info.banner})"></div>` : ''}
<div class="info">
  ${
    this.info.icon
      ? `<img class="icon" src="${this.info.icon}" alt="r/" />`
      : `<div class="icon">r/</div>`
  }
  <a class="name" href="https://www.reddit.com/r/${this.info.name}" target="_blank">r/${this.info.name}</a>
</div>
<div class="actions">
  <div>
    <i class="fa-solid fa-arrow-down-wide-short"></i> Sort by:
    <span class="select">
      <i class="fa-solid fa-caret-down"></i>
    </span>
  </div>
</div>
<ul class="posts">
</ul>`

      this.htmlElement.querySelector('.info').appendChild(menuButton)
      this.htmlElement
        .querySelector('.posts')
        .append(...this.posts.map((post) => post.getHTMLElement()))

      const loadPostButton = document.createElement('button')
      loadPostButton.innerText = 'Load more'
      loadPostButton.className = 'load'
      loadPostButton.onclick = () =>
        this.fetchPosts(this.posts[this.posts.length - 1].name)
      this.htmlElement.querySelector('.posts').after(loadPostButton)

      const refreshButton = document.createElement('button')
      refreshButton.innerHTML = '<i class="fa-solid fa-rotate-right"></i>'
      refreshButton.onclick = () => {
        this.htmlElement.querySelector('.posts').innerHTML = ''
        this.fetchPosts()
      }
      this.htmlElement.querySelector('.actions').appendChild(refreshButton)

      const sortSelect = document.createElement('select')
      sortSelect.innerHTML = ['Hot', 'Top', 'New', 'Rising']
        .map(
          (sortOption) =>
            `<option value="${sortOption.toLowerCase()}" ${sortOption.toLowerCase() === this.sort ? 'selected' : ''}>${sortOption}</option>`
        )
        .join('\n')
      sortSelect.onchange = () => {
        this.sort = sortSelect.value
        this.notify('sort-change', { sort: this.sort })
        this.htmlElement.querySelector('.posts').innerHTML = ''
        this.fetchPosts()
      }
      this.htmlElement.querySelector('.select').prepend(sortSelect)

      this.on('fetch-post-start', () => {
        loadPostButton.disabled = true
        loadPostButton.innerHTML = '<i class="fa-solid fa-spinner"></i>'
      })
      this.on('fetch-post-finish', () => {
        this.htmlElement.querySelector('.posts').innerHTML = ''
        this.htmlElement
          .querySelector('.posts')
          .append(...this.posts.map((post) => post.getHTMLElement()))

        loadPostButton.disabled = false
        loadPostButton.innerHTML = 'Load more'
      })

      this.notify('html-load')
    })

    return this.htmlElement
  }
}

export class Post {
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

  getHTMLElement() {
    const post = document.createElement('li')
    post.className = 'post'
    post.onclick = () => this.subreddit.notify('post-open', { post: this })

    post.innerHTML = `
<div class="info">
  <div class="author">u/${this.author}</div>
  <div class="title">${this.title}</div>
  ${this.type !== 'text' ? `<div class="type">${this.type}</div>` : ''}
  <div class="comments-time">${formatNumber(this.commentCount)} comments &middot; ${formatDate(this.timestampSec)}</div>
</div>
<div class="score">
  <i class="fa-solid fa-angle-up"></i>
  <div>${formatNumber(this.score)}</div>
</div>`

    return post
  }
}

export class Comment {
  constructor(post, id, content, author, score, replies, timestampSec) {
    this.post = post
    this.id = id
    this.content = content
    this.author = author
    this.score = score
    this.replies = replies
    this.timestampSec = timestampSec
  }

  getHTMLElements(depth, parentComment) {
    if (!depth) depth = 0

    const comment = document.createElement('li')
    comment.className = 'comment'
    comment.style.marginLeft = `${depth}rem`

    if (this.id === '_') {
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
          comment.getHTMLElements(depth + 1, this)
        )
      )

    return elements
  }
}
