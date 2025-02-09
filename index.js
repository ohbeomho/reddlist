const baseURL = 'https://api.reddit.com'

class Subreddit {
  static add(name) {
    localData.push({ name, sort: 'hot' })
    save()
  }

  // Reddit style number format
  // 1000 -> 1K
  // 1000000 -> 1M
  // 1000000000 -> 1B
  static formatNumber(num) {
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
  static formatDate(timestampSec) {
    const now = Math.floor(Date.now() / 1000)
    let diff = now - timestampSec, n = 0
    const units = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year']
    const div = [60, 60, 24, 7, 30, 12]

    while (true) {
      if (Math.floor(diff / div[n]) < 1) break

      diff = Math.floor(diff / div[n])
      n++
    }

    return [diff, units[n] + (diff > 1 ? 's' : '')]
  }

  constructor(name, sort) {
    this.info = { name }
    this.sort = sort
    this.posts = []
  }

  // Fetch posts from the subreddit
  async fetchPosts(after) {
    const response = await fetch(
      `${baseURL}/r/${this.info.name}/${this.sort}.json${after ? `?after=${after}` : ''}`,
    )
    const parsed = await response.json()
    return parsed.data.children.map((post) => {
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
      return {
        title,
        id,
        name,
        content,
        author,
        commentCount,
        score,
        timestampSec
      }
    })
  }

  // Fetch additional information of the subreddit.
  async fetchInfo() {
    const response = await fetch(`${baseURL}/r/${this.info.name}/about.json`)
    const parsed = await response.json()
    const {
      public_description: desc,
      banner_background_image: bannerURL,
      community_icon: iconURL,
    } = parsed.data
    return {
      desc,
      bannerURL,
      iconURL: iconURL || parsed.data.icon_img,
    }
  }

  async fetchData() {
    try {
      this.posts.push(...(await this.fetchPosts()))
      Object.assign(this.info, await this.fetchInfo())
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

  async refresh() {
    this.posts = []
    await this.fetchData()
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

    const optionsButton = document.createElement('button')
    optionsButton.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>'
    optionsButton.className = 'options'
    optionsButton.onclick = (e) => {
      optionsMenu.openMenu(this, optionsButton)
      e.stopPropagation()
    }


    const loadButton = document.createElement('button')
    loadButton.innerText = 'Load more'
    loadButton.style.display = 'block'
    loadButton.style.margin = '1rem auto'
    loadButton.onclick = () => {
      startLoading(loadButton)
      this.fetchPosts(this.posts[this.posts.length - 1].name).then(
        (newPosts) => {
          element.querySelector('.posts').innerHTML += getPostElements(newPosts)
          this.posts.push(...newPosts)
          finishLoading(loadButton)
        }
      )
    }

    const refreshButton = document.createElement('button')
    refreshButton.innerHTML = '<i class="fa-solid fa-rotate-right"></i>'
    refreshButton.onclick = () => {
      startLoading(loadButton)
      element.querySelector('.posts').innerHTML = ''
      this.refresh().then(() => {
        element.querySelector('.posts').innerHTML = getPostElements(this.posts)
        finishLoading(loadButton)
      })
    }

    const sortSelect = document.createElement('select')
    sortSelect.innerHTML = ['Hot', 'Top', 'New', 'Rising'].map((sortOption) =>
      `<option value="${sortOption.toLowerCase()}" ${sortOption.toLowerCase() === this.sort ? 'selected' : ''}>${sortOption}</option>`
    ).join('\n')
    sortSelect.onchange = () => {
      this.sort = sortSelect.value
      localData = localData.map((data) => data.name === this.info.name ? { ...data, sort: this.sort } : data)
      this.posts = []
      element.querySelector('.posts').innerHTML = ''
      startLoading(loadButton)
      this.fetchPosts().then((newPosts) => {
        element.querySelector('.posts').innerHTML = getPostElements(newPosts)
        finishLoading(loadButton)
        this.posts.push(...newPosts)
      })
      save()
    }

    const getPostElements = (posts) =>
      posts
        .map(
          (post) => `
  <li class="post">
    <div class="info">
      <a class="author" href="https://www.reddit.com/u/${post.author}" target="_blank">u/${post.author}</a>
      <a class="title" href="https://www.reddit.com/r/${this.info.name}/comments/${post.id}" target="_blank">${post.title}</a>
      <div class="time">${Subreddit.formatDate(post.timestampSec).join(' ')} ago</div>
    </div>
    <div class="score">
      <i class="fa-solid fa-angle-up"></i>
      <div>${Subreddit.formatNumber(post.score)}</div>
    </div>
  </li>`,
        )
        .join('\n')

    element.innerHTML = `
${this.info.bannerURL ? `<div class="banner" style="background-image: url(${this.info.bannerURL})"></div>` : ''}
<div class="info">
  <img class="icon" src="${this.info.iconURL}" alt="r/" />
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
  ${getPostElements(this.posts)}
</ul>`

    element.querySelector('&>.info').appendChild(optionsButton)
    element.querySelector('.posts').after(loadButton)
    element.querySelector('.select').prepend(sortSelect)
    element.querySelector('.actions').appendChild(refreshButton)

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
const optionsMenu = document.querySelector('div.options')

optionsMenu.openMenu = (subreddit, button) => {
  optionsMenu.currentSubreddit = subreddit
  optionsMenu.style.opacity = 1
  optionsMenu.style.pointerEvents = 'all'
  const { top, left } = button.getBoundingClientRect()
  optionsMenu.style.top = `${top + button.clientHeight / 2}px`
  optionsMenu.style.left = `${left + button.clientWidth / 2}px`
  optionsMenu.opened = true
}
optionsMenu.closeMenu = () => {
  optionsMenu.currentSubreddit = null
  optionsMenu.style.opacity = 0
  optionsMenu.style.pointerEvents = 'none'
  optionsMenu.opened = false

  setTimeout(() => {
    optionsMenu.style.top = '-1000px'
    optionsMenu.style.left = '-1000px'
  }, 300)
}

const loadingButtons = {}

function startLoading(button) {
  button.disabled = true
  loadingButtons[button] = button.innerHTML
  button.innerHTML = '<i class="fa-solid fa-spinner"></i>'
}

function finishLoading(button) {
  button.disabled = false
  button.innerHTML = loadingButtons[button]
  delete loadingButtons[button]
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
  const newSubreddit = new Subreddit(input.value, 'hot')
  subreddits.push(newSubreddit)
  newSubreddit.fetchData().then(() => {
    document
      .querySelector('main>div:last-child')
      .before(newSubreddit.getHTMLElement())
    finishLoading(addButton)
  })
  document.querySelector('.message')?.remove()
  input.value = ''
  addDialog.close()
  startLoading(addButton)
}
addButton.onclick = () => addDialog.showModal()

window.onload = () => {
  messageDiv.innerText = subreddits.length
    ? 'Loading...'
    : 'Click here to add a subreddit'
  messageDiv.classList.add('message')
  if (subreddits.length) messageDiv.classList.add('loading')
  addButton.after(messageDiv)

  startLoading(addButton)

  Promise.all(subreddits.map((subreddit) => subreddit.fetchData())).then(() => {
    finishLoading(addButton)
    if (messageDiv.classList.length === 2) messageDiv.remove()
    subreddits.forEach((subreddit) =>
      document
        .querySelector('main>div:last-child')
        .before(subreddit.getHTMLElement()),
    )
  })
}

window.onclick = (e) => {
  if (optionsMenu.opened && (e.clientX < optionsMenu.clientLeft || e.clientY < optionsMenu.clientTop || e.clientX > optionsMenu.clientLeft + optionsMenu.clientWidth || e.clientY > optionsMenu.clientTop + optionsMenu.clientHeight)) optionsMenu.closeMenu()
}

document.querySelector('main').onscroll = () => optionsMenu.closeMenu()
document.querySelector('button.remove').onclick = (e) => {
  if (!optionsMenu.currentSubreddit) return

  optionsMenu.currentSubreddit.remove()
  optionsMenu.closeMenu()
  e.stopPropagation()
}
