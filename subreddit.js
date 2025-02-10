const baseURL = 'https://api.reddit.com'

// Reddit style number format
// 1000 -> 1K
// 1000000 -> 1M
// 1000000000 -> 1B
function formatNumber(num) {
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

  return [diff, units[n] + (diff > 1 ? 's' : '')]
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
      'sort-change': []
    }
    this.args = {
      'fetch-start': [],
      'fetch-info-start': [],
      'fetch-info-finish': [],
      'fetch-post-start': [],
      'fetch-post-finish': [],
      'fetch-finish': ['info'],
      remove: [],
      'sort-change': ['sort']
    }
  }

  getData() {
    return { name: this.info.name, sort: this.sort }
  }

  notify(event) {
    this.listeners[event]?.forEach((listener) => {
      listener(...this.args[event].map((argName) => this[argName]))

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

  // Fetch posts from the subreddit
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
          name,
          selftext: content,
          author,
          num_comments: commentCount,
          score,
          created: timestampSec
        } = post.data
        return new Post(
          this.info.name,
          title,
          id,
          name,
          content,
          author,
          commentCount,
          score,
          timestampSec
        )
      })
    )

    this.notify('fetch-post-finish')
  }

  // Fetch additional information of the subreddit.
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
      this.notify('fetch-finish')
    }
  }

  remove() {
    this.htmlElement.remove()
    this.notify('remove')
  }

  getHTMLElement() {
    const element = document.createElement('div')
    element.className = 'subreddit'

    this.htmlElement = element

    if (this.err) {
      const removeButton = document.createElement('button')
      removeButton.innerText = 'Remove'
      removeButton.style.color = 'black'
      removeButton.onclick = () => this.remove()
      element.innerHTML = `
<div class="error">
  Error loading:
  <br />
  <b>r/${this.info.name}</b>
</div>
<div class="error-message">${this.err}</div>`
      element.appendChild(removeButton)
      return element
    }

    element.innerHTML = `
${this.info.banner ? `<div class="banner" style="background-image: url(${this.info.banner})"></div>` : ''}
<div class="info">
  <img class="icon" src="${this.info.icon}" alt="r/" />
  <a class="name" href="https://www.reddit.com/r/${this.info.name}" target="_blank">r/${this.info.name}</a>
</div>`

    const loadButton = document.createElement('button')
    loadButton.innerText = 'Load'
    loadButton.className = 'load'
    loadButton.onclick = () => this.fetchData()

    const loadingSpinner = document.createElement('div')
    loadingSpinner.className = 'loading'
    loadingSpinner.innerHTML = '<i class="fa-solid fa-spinner"></i>'

    element.appendChild(loadButton)

    this.once('fetch-start', () => {
      element.style.filter = 'brightness(0.9)'
      element.appendChild(loadingSpinner)
    })
    this.once('fetch-finish', () => {
      element.style.filter = 'none'
      loadingSpinner.remove()
      loadButton.remove()

      const optionsButton = document.createElement('button')
      optionsButton.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>'
      optionsButton.className = 'options'

      const loadPostButton = document.createElement('button')
      loadPostButton.innerText = 'Load more'
      loadPostButton.className = 'load'
      loadPostButton.onclick = () =>
        this.fetchPosts(this.posts[this.posts.length - 1].name)

      const refreshButton = document.createElement('button')
      refreshButton.innerHTML = '<i class="fa-solid fa-rotate-right"></i>'
      refreshButton.onclick = () => {
        element.querySelector('.posts').innerHTML = ''
        this.fetchPosts()
      }

      const sortSelect = document.createElement('select')
      sortSelect.innerHTML = ['Hot', 'Top', 'New', 'Rising']
        .map(
          (sortOption) =>
            `<option value="${sortOption.toLowerCase()}" ${sortOption.toLowerCase() === this.sort ? 'selected' : ''}>${sortOption}</option>`
        )
        .join('\n')
      sortSelect.onchange = () => {
        this.sort = sortSelect.value
        this.notify('sort-change')
        element.querySelector('.posts').innerHTML = ''
        this.fetchPosts()
      }

      element.innerHTML = `
${this.info.banner ? `<div class="banner" style="background-image: url(${this.info.banner})"></div>` : ''}
<div class="info">
  <img class="icon" src="${this.info.icon}" alt="r/" />
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
  ${this.posts.map((post) => post.getHTML()).join('')}
</ul>`

      element.querySelector('&>.info').appendChild(optionsButton)
      element.querySelector('.posts').after(loadPostButton)
      element.querySelector('.select').prepend(sortSelect)
      element.querySelector('.actions').appendChild(refreshButton)

      this.on('fetch-post-start', () => {
        loadPostButton.disabled = true
        loadPostButton.innerHTML = '<i class="fa-solid fa-spinner"></i>'
      })
      this.on('fetch-post-finish', () => {
        element.querySelector('.posts').innerHTML = this.posts
          .map((post) => post.getHTML())
          .join('')

        loadPostButton.disabled = false
        loadPostButton.innerHTML = 'Load more'
      })
    })

    return element
  }
}

export class Post {
  constructor(
    subreddit,
    title,
    id,
    name,
    content,
    author,
    commentCount,
    score,
    timestampSec
  ) {
    this.subreddit = subreddit
    this.title = title
    this.id = id
    this.name = name
    this.content = content
    this.author = author
    this.commentCount = commentCount
    this.score = score
    this.timestampSec = timestampSec
  }

  getHTML() {
    return `
  <li class="post">
    <div class="info">
      <a class="author" href="https://www.reddit.com/u/${this.author}" target="_blank">u/${this.author}</a>
      <a class="title" href="https://www.reddit.com/r/${this.subreddit}/comments/${this.id}" target="_blank">${this.title}</a>
      <div class="time">${formatDate(this.timestampSec).join(' ')} ago</div>
    </div>
    <div class="score">
      <i class="fa-solid fa-angle-up"></i>
      <div>${formatNumber(this.score)}</div>
    </div>
  </li>`
  }
}
