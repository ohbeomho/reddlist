const baseURL = 'https://api.reddit.com'

class Subreddit {
  #sort

  static get POST_SORT_OPTIONS() {
    return ['hot', 'new', 'top', 'rising']
  }

  static add(name) {
    subreddits.push({ name, sort: 'hot' })
    localStorage.setItem('reddlist-subreddits', JSON.stringify(subreddits))
  }

  /**
   * @param {string} value
   */
  set sort(value) {
    if (!Subreddit.POST_SORT_OPTIONS.includes(value))
      throw new Error('Invalid sort option')
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
    this.posts = await this.#fetchPosts()
    Object.assign(this.info, await this.#fetchInfo())
  }

  getHTMLElement() {
    const element = document.createElement('div')
    element.className = 'subreddit'
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

const subreddits = JSON.parse(
  localStorage.getItem('reddlist-subreddits') || '[]',
).map((data) => new Subreddit(data.name, data.sort))

const addDialog = document.querySelector('dialog.add')
const addButton = document.querySelector('button.add')
const messageDiv = document.createElement('div')
addButton.disabled = true
addButton.finishLoading = () => {
  addButton.disabled = false
  addButton.innerHTML = '+'
  messageDiv.remove()
}

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
  document.querySelector('.message')?.remove()
  input.value = ''
}
addButton.onclick = () => addDialog.showModal()

window.onload = () => {
  messageDiv.innerText = subreddits.length
    ? 'Loading...'
    : 'Click here to add a subreddit'
  messageDiv.className = 'message'
  addButton.after(messageDiv)

  if (!subreddits.length) addButton.finishLoading()

  Promise.all(subreddits.map((subreddit) => subreddit.fetch())).then(() => {
    addButton.finishLoading()
    subreddits.forEach((subreddit) =>
      document.querySelector('main').prepend(subreddit.getHTMLElement()),
    )
  })
}
