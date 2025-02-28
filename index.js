import { Subreddit, Comment, baseURL } from './subreddit.js'

const loadedComments = {}

function unescapeHTML(html) {
  // replacing &amp; twice because links in selftext
  // already has &amp; so in selftext_html it becomes &amp;amp;
  return html
    .replaceAll('&amp;', '&')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replace(/&#0?39;/g, "'")
}

async function loadComments(post) {
  if (!loadedComments[post.id]) {
    const res = await fetch(`${baseURL}/comments/${post.id}?depth=3&limit=30`)
    const data = await res.json()
    const comments = data[1]

    const parseComments = (comments) => {
      return comments
        ? comments.data.children
            .map((comment) => {
              const {
                id,
                body: content,
                author,
                score,
                replies,
                created: timestampSec,
                children
              } = comment.data
              return new Comment(
                post,
                children ? '_' : id,
                content,
                author,
                score,
                parseComments(replies),
                timestampSec
              )
            })
            .filter((comment) => comment !== null)
        : []
    }

    loadedComments[post.id] = parseComments(comments)

    // Delete data from loadedComments after 5 min
    setTimeout(() => delete loadedComments[post.id], 1000 * 60 * 5)
  }

  return loadedComments[post.id]
}

function equalsIgnoreCase(str1, str2) {
  if (typeof str1 !== 'string' || typeof str2 !== 'string')
    throw new Error('This function can only compare strings.')
  return str1.toLowerCase() === str2.toLowerCase()
}

function subredditEvents(subreddit) {
  subreddit.on('fetch-finish', (info) => {
    const { name, icon, banner } = info
    localData = localData.map((data) =>
      equalsIgnoreCase(data.name, name) ? { ...data, name, icon, banner } : data
    )
    save()
  })
  subreddit.once('html-load', () => {
    changeIcon(subreddit, subreddits.indexOf(subreddit))
    changeCurrentIcon()
  })
  subreddit.on('sort-change', (sort) => {
    localData = localData.map((data) =>
      equalsIgnoreCase(data.name, subreddit.info.name)
        ? { ...data, sort }
        : data
    )
    save()
  })
  subreddit.on('remove', () => {
    removeIcon(currIdx)
    subreddits.splice(subreddits.indexOf(subreddit), 1)
    changeCurrentIcon()
    localData = localData.filter(
      (data) => !equalsIgnoreCase(data.name, subreddit.info.name)
    )
    save()
  })
  subreddit.on('post-open', (post) => {
    const content = postDialog.querySelector('.content')
    const commentList = postDialog.querySelector('.comments')

    commentList.innerHTML = ''
    content.innerHTML = `
<a href="${post.url}" target="_blank">View on reddit</a>
<h1>${post.title}</h1>
<div>
  ${post.type === 'image' ? `<img src="${post.content.image}" alt="post image" />` : ''}
  ${post.type === 'link' ? `<a href="${post.content.link}" target="_blank">${post.content.link}</a>` : ''}
  ${
    post.type === 'video'
      ? `<video controls>${Object.values(post.content.video)
          .map((videoUrl) => `<source src="${unescapeHTML(videoUrl)}" />`)
          .join('')}</video>`
      : ''
  }
</div>
${post.content.text ? `<div>${unescapeHTML(post.content.text)}</div>` : ''}`

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
          ? '100%'
          : '50vh'
        if (node === 'img')
          mediaElement.style[isWide ? 'width' : 'height'] = '100%'
        else if (node === 'video')
          mediaElement[isWide ? 'width' : 'height'] =
            mediaElement.parentElement[isWide ? 'clientWidth' : 'clientHeight']
      }
    })
    // TODO: Add post score

    const setCommentList = (comments) => {
      // TODO: Add sort option, comment count, refresh button at top
      commentList.append(
        ...comments.flatMap((comment) => comment.getHTMLElements())
      )
    }
    const handleError = (err) => {
      console.error(err)
    }

    if (!loadedComments[post.id]) {
      const loadButton = document.createElement('button')
      loadButton.innerText = 'Load comments'
      loadButton.onclick = () => {
        li.remove()
        loadComments(post).then(setCommentList).catch(handleError)
      }
      const li = document.createElement('li')
      li.appendChild(loadButton)
      commentList.appendChild(li)
    } else loadComments(post).then(setCommentList)

    postDialog.showModal()
  })
}

let localData = JSON.parse(localStorage.getItem('reddlist-subreddits') || '[]')
const subreddits = localData.map((data) => {
  const { name, sort, icon, banner } = data
  const subreddit = new Subreddit(name, icon, banner, sort)

  return subreddit
})

function save() {
  localStorage.setItem('reddlist-subreddits', JSON.stringify(localData))
}

const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)

const main = document.querySelector('main')
const addDialog = document.querySelector('dialog.add')
const postDialog = document.querySelector('dialog.post')
const addButton = document.querySelector('button.add')
const icons = document.querySelector('.icons')

const addIconElement = document.createElement('div')
addIconElement.innerText = '+'
addIconElement.onclick = () => {
  main.scroll(main.scrollWidth, 0)
  currIdx = subreddits.length
}
icons.appendChild(addIconElement)

const iconElements = []
let lastCurrentElement,
  currIdx = 0

function addIconListener(icon) {
  icon.onclick = () => {
    currIdx = iconElements.indexOf(icon)
    main.scroll(subreddits[currIdx].htmlElement.offsetLeft - fontSize, 0)
  }
}

function addIcon(subreddit) {
  const icon = subreddit.htmlElement.querySelector('.icon')
  const newIcon = icon.cloneNode()
  newIcon.innerHTML = icon.innerHTML

  addIconElement.before(newIcon)
  iconElements.push(newIcon)

  addIconListener(newIcon)
}

function changeIcon(subreddit, idx) {
  const icon = subreddit.htmlElement.querySelector('.icon')
  const newIcon = icon.cloneNode()
  newIcon.innerHTML = icon.innerHTML

  iconElements[idx].replaceWith(newIcon)
  iconElements.splice(idx, 1, newIcon)

  addIconListener(newIcon)
}

function removeIcon(idx) {
  iconElements[idx].remove()
  iconElements.splice(idx, 1)
}

function changeCurrentIcon() {
  let newCurrent
  if (currIdx >= subreddits.length) newCurrent = addIconElement
  else newCurrent = iconElements[currIdx]

  lastCurrentElement.classList.remove('current')
  newCurrent.classList.add('current')
  lastCurrentElement = newCurrent

  icons.style.left = `calc(50% - ${newCurrent.offsetLeft}px - 1rem)`
}

document
  .querySelectorAll('dialog')
  .forEach(
    (dialog) =>
      (dialog.querySelector('button.close').onclick = () => dialog.close())
  )

function addSubreddit() {
  const input = addDialog.querySelector('input')
  if (!input.value) return

  const newSubreddit = new Subreddit(input.value, null, null, 'hot')
  localData.push({ name: input.value, sort: 'hot' })
  save()

  subreddits.push(newSubreddit)

  document
    .querySelector('main>div:last-child')
    .before(newSubreddit.getHTMLElement())
  addIcon(newSubreddit)
  subredditEvents(newSubreddit)
  changeCurrentIcon()

  document.querySelector('.message')?.remove()
  input.value = ''
  addDialog.close()
}

addDialog.querySelector('button:not(.close)').onclick = addSubreddit
addDialog.querySelector('input').onkeydown = (e) => {
  if (e.key !== 'Enter') return

  addSubreddit()
  e.preventDefault()
}

addButton.onclick = () => {
  addDialog.showModal()
  addDialog.querySelector('input').focus()
}

window.onload = () => {
  main.scroll(0, 0)

  if (!subreddits.length) {
    const messageDiv = document.createElement('div')
    messageDiv.innerText = 'Click here to add a subreddit'
    messageDiv.className = 'message'
    addButton.after(messageDiv)
  }

  subreddits.forEach((subreddit) => {
    document
      .querySelector('main>div:last-child')
      .before(subreddit.getHTMLElement())
    addIcon(subreddit)
    subredditEvents(subreddit)
  })

  const currentElement = subreddits.length ? iconElements[0] : addIconElement
  currentElement.classList.add('current')
  lastCurrentElement = currentElement
}

window.onclick = () =>
  document.querySelectorAll('.menu.open').forEach((menu) => menu.close())

if (window.innerWidth <= 500) {
  const touchStart = { x: -1, y: -1 }

  window.ontouchstart = (e) => {
    const { clientX: x, clientY: y } = e.touches[0]
    touchStart.x = x
    touchStart.y = y
  }
  window.ontouchmove = (e) => {
    if (touchStart.x === -1) return
    const { clientX: x, clientY: y } = e.touches[0]
    const xdiff = touchStart.x - x
    const ydiff = touchStart.y - y

    if (Math.abs(xdiff) < Math.abs(ydiff) || Math.abs(xdiff) < 50) return

    if (xdiff < 0 && currIdx > 0) currIdx--
    else if (xdiff > 0 && currIdx < subreddits.length) currIdx++

    main.scroll(
      (currIdx < subreddits.length
        ? subreddits[currIdx].htmlElement.offsetLeft
        : main.scrollWidth) - fontSize,
      0
    )

    touchStart.x = -1
    touchStart.y = -1
  }

  main.onscroll = () => changeCurrentIcon()
}
