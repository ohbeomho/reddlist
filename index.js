const baseURL = 'https://api.reddit.com'

class Subreddit {
  #sort

  static get POST_SORT_OPTIONS() {
    return ['hot', 'new', 'top', 'rising']
  }

  static add(name) {
    localData.push({ name, sort: 'hot' })
    save()
  }

  /**
   * @param {string} value
   */
  set sort(value) {
    if (!Subreddit.POST_SORT_OPTIONS.includes(value))
      throw new Error('Invalid sort option')
    localData = localData.map((subreddit) =>
      subreddit.name === this.name ? { ...subreddit, sort: value } : subreddit,
    )
    save()
    this.#sort = sort
  }

  constructor(name, sort) {
    this.info = { name }
    this.#sort = sort
    this.posts = []
  }

  // Fetch posts from the subreddit
  async #fetchPosts() {
    // TODO: Load media (images/videos)
    const response = await fetch(
      `${baseURL}/r/${this.info.name}/${this.#sort}.json`,
    )
    const parsed = await response.json()
    return parsed.data.children.map((post) => {
      const {
        title,
        selftext: content,
        author,
        num_comments: commentCount,
        score,
      } = post.data
      return {
        title,
        content,
        author,
        commentCount,
        score,
      }
    })
  }

  // Fetch additional information of the subreddit.
  async #fetchInfo() {
    const response = await fetch(`${baseURL}/r/${this.info.name}/about.json`)
    const parsed = await response.json()
    const {
      public_description: desc,
      banner_background_image: bannerURL,
      icon_img: iconURL,
    } = parsed.data
    return {
      desc,
      bannerURL,
      iconURL,
    }
  }

  async fetch() {
    try {
      this.posts = await this.#fetchPosts()
      Object.assign(this.info, await this.#fetchInfo())
    } catch (err) {
      this.err = err
    }
  }

  remove() {
    const idx = subreddits.indexOf(this)
    localData.splice(idx, 1)
    subreddits.splice(idx, 1)
    document.querySelector(`.subreddit:nth-of-type(${idx + 1})`).remove()
    save()
  }

  getHTMLElement() {
    const element = document.createElement('div')
    element.className = 'subreddit'
    if (this.err) {
      const removeButton = document.createElement('button')
      removeButton.innerText = 'Remove'
      removeButton.style.color = 'black'
      removeButton.onclick = () => this.remove()
      element.innerHTML = `<div class="error">
        Error loading:
        <br />
        <b>r/${this.info.name}</b>
      </div>
<div class="error-message">${this.err}</div>`
      element.appendChild(removeButton)
      return element
    }

    element.innerHTML = `<div class="banner"></div>
<div class="info">
  <div class="logo"></div>
  <div class="name">r/${this.info.name}</div>
</div>
<ul class="posts">${this.posts.map(
      (post) => `
  <li class="post">
    <div class="info">
      <div class="author">${post.author}</div>
      <div class="title">${post.title}</div>
    </div>
    <div class="score">
      <i class="fa-solid fa-angle-up"></i>
      <div>${post.score}</div>
    </div>
  </li>`,
    )}
  <li>
    <button>Load more</button>
  </li>
</ul>`
    return element
  }
}

let localData = JSON.parse(localStorage.getItem('reddlist-subreddits') || '[]')
const subreddits = localData.map((data) => new Subreddit(data.name, data.sort))

function save() {
  localStorage.setItem('reddlist-subreddits', JSON.stringify(localData))
}

const addDialog = document.querySelector('dialog.add')
const addButton = document.querySelector('button.add')
const messageDiv = document.createElement('div')
addButton.startLoading = () => {
  addButton.disabled = true
  addButton.innerHTML = '<i class="fa-solid fa-spinner"></i>'
}
addButton.finishLoading = () => {
  addButton.disabled = false
  addButton.innerHTML = '+'
}

addButton.startLoading()

// Close the dialog when the outside of the dialog is clicked.
addDialog.onclick = (e) =>
  (e.offsetX < 0 ||
    e.offsetY < 0 ||
    e.offsetX > addDialog.clientWidth ||
    e.offsetY > addDialog.clientHeight) &&
  addDialog.close()
addDialog.querySelector('button').onclick = () => {
  const input = addDialog.querySelector('input')
  if (!input.value) return

  Subreddit.add(input.value)
  const newSubreddit = new Subreddit(input.value, 'hot')
  subreddits.push(newSubreddit)
  newSubreddit.fetch().then(() => {
    document
      .querySelector('main>div:last-child')
      .before(newSubreddit.getHTMLElement())
    addButton.finishLoading()
  })
  document.querySelector('.message')?.remove()
  input.value = ''
  addDialog.close()
  addButton.startLoading()
}
addButton.onclick = () => addDialog.showModal()

window.onload = () => {
  messageDiv.innerText = subreddits.length
    ? 'Loading...'
    : 'Click here to add a subreddit'
  messageDiv.classList.add('message')
  if (subreddits.length) messageDiv.classList.add('loading')
  addButton.after(messageDiv)

  if (!subreddits.length) addButton.finishLoading()

  Promise.all(subreddits.map((subreddit) => subreddit.fetch())).then(() => {
    addButton.finishLoading()
    if (messageDiv.classList.length === 2) messageDiv.remove()
    subreddits.forEach((subreddit) =>
      document
        .querySelector('main>div:last-child')
        .before(subreddit.getHTMLElement()),
    )
  })
}
