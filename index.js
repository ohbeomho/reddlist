const baseURL = 'https://api.reddit.com'
const options = JSON.parse(
  localStorage.getItem('reddlist-options') || '{ "defaultSort": "hot" }',
)
const subreddits = JSON.parse(
  localStorage.getItem('reddlist-subreddits') || '[]',
)

const dialogs = Array.from(document.querySelectorAll('dialog'))
const navButtons = Array.from(document.querySelectorAll('nav button'))

dialogs.forEach(
  (dlg) =>
    (dlg.onclick = (e) =>
      (e.offsetX < 0 ||
        e.offsetY < 0 ||
        e.offsetX > dlg.clientWidth ||
        e.offsetY > dlg.cientHeight) &&
      dlg.close()),
)
navButtons.forEach((btn, idx) => (btn.onclick = () => dialogs[idx].showModal()))

function changeOption(optionName, value) {
  options[optionName] = value
  localStorage.setItem('reddlist-options', JSON.stringify(options))
}

class Subreddit {
  static get POST_SORT_OPTIONS() {
    return ['hot', 'new', 'top', 'rising']
  }

  static add(name) {
    subreddits.push(new Subreddit(name))
    localStorage.setItem('reddlist-subreddits', JSON.stringify(subreddits))
  }

  constructor(name) {
    this.name = name
    this.fetchPosts(options.defaultSort)
    this.fetchInfo()
  }

  async fetchPosts(sort) {
    if (!Subreddit.POST_SORT_OPTIONS.includes(sort))
      throw new Error('[Subreddit.fetchPosts] Invalid sort option')
    // TODO: Load media (images/videos)
    const response = await fetch(`${baseURL}/r/${this.name}/${sort}.json`)
    const parsed = await response.json()
    this.posts = parsed.data.children.map((post) => ({
      title: post.data.title,
      content: post.data.selftext,
      author: post.data.author,
      commentCount: post.data.num_comments,
      score: post.data.score,
    }))
  }

  fetchInfo() {}

  getHTML(isCard) {
    return `<div class="subreddit">
  <img class="banner" />
  <div class="info">
    <img class="logo" />
    <div class="name">r/${this.name}</div>
  </div>
  <ul class="posts">${(isCard ? this.posts.slice(0, 3) : this.posts).map(
    (post) => `
    <li class="post">
      <div class="info">
        <div class="title">${post.title}</div>
        <div class="author">${post.author}</div>
      </div>
      <div class="score">
        <i class="fa-solid fa-up-long"></i>
        <span>${post.score}</span>
        <i class="fa-solid fa-down-long"></i>
      </div>
    </li>`,
  )}
  </ul>
</div>`
  }
}

window.onload = () => {}
