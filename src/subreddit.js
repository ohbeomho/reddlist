import { getJson } from './utils/request'
import { Listener } from './listener'
import { Post } from './post'

export const REDDIT_API = 'https://api.reddit.com'

export class Subreddit extends Listener {
  /**
   * @param {string} name
   * @param {string | null} icon
   * @param {string | null} banner
   * @param {string} sort
   */
  constructor(name, icon, banner, sort) {
    super([
      { name: 'fetch-start' },
      { name: 'fetch-finish' },
      { name: 'fetch-post-start' },
      { name: 'fetch-post-finish' },
      { name: 'remove' },
      { name: 'sort-change', args: ['sort'] },
      { name: 'post-open', args: ['post'] },
      { name: 'html-load' }
    ])
    /** @type {Object.<string, any>} */
    this.info = { name, icon, banner }
    this.sort = sort
    /** @type {Post[]} */
    this.posts = []
    /** @type {HTMLDivElement} */
    this.htmlElement = null
  }

  /**
   * @param {string?} after
   */
  async fetchPosts(after) {
    this.notify('fetch-post-start')

    if (!after) this.posts = []

    const jsonData = await getJson(
      `${REDDIT_API}/r/${this.info.name}/${this.sort}${after ? `?after=${after}` : ''}`
    )

    const parsePostData = (postData) => {
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
        crosspost_parent_list,
        is_self,
        media,
        media_metadata,
        permalink,
        name,
        url_overridden_by_dest
      } = postData

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
          image: type === 'image' ? url_overridden_by_dest : null,
          video:
            type === 'video'
              ? Object.entries(media.reddit_video)
                .filter(([key, _]) =>
                  ['hls_url', 'dash_url', 'fallback_url'].includes(key)
                )
                .map(([_, value]) => value)
              : null,
          link: url_overridden_by_dest,
          gallery: media_metadata
            ? Object.values(media_metadata).map(({ s }) => s?.u)
            : null,
          crosspost:
            type === 'crosspost'
              ? parsePostData(crosspost_parent_list[0])
              : null
        },
        author,
        commentCount,
        score,
        thumbnail,
        `https://www.reddit.com${permalink}`,
        timestampSec
      )
    }

    this.posts.push(
      ...jsonData.data.children.map((post) => parsePostData(post.data))
    )

    this.notify('fetch-post-finish')
  }

  async fetchInfo() {
    const parsed = await getJson(`${REDDIT_API}/r/${this.info.name}/about`)
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

  getHtmlElement() {
    this.htmlElement = document.createElement('div')
    this.htmlElement.classList.add('subreddit')

    const removeButton = document.createElement('button')
    removeButton.className = 'remove'
    removeButton.innerText = 'Remove'
    removeButton.onclick = () => this.remove()

    if (this.err) {
      this.htmlElement.innerHTML = `
<div class="error">
  Failed to load
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
  ${this.info.icon
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
  ${this.info.icon
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
        .append(...this.posts.map((post) => post.getHtmlElement()))

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
          .append(...this.posts.map((post) => post.getHtmlElement()))

        loadPostButton.disabled = false
        loadPostButton.innerHTML = 'Load more'
      })

      this.notify('html-load')
    })

    return this.htmlElement
  }
}
