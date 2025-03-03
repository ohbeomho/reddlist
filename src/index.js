import { Subreddit } from './subreddit'
import { Icon } from './icon'

import './styles/index.css'

import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/brands'

/**
 * @param {string} str2
 * @param {string} str1
 */
function equalsIgnoreCase(str1, str2) {
  if (typeof str1 !== 'string' || typeof str2 !== 'string')
    throw new Error('이 함수는 string 값만 비교할 수 있습니다.')
  return str1.toLowerCase() === str2.toLowerCase()
}

/**
 * @param {Subreddit} subreddit
 */
function subredditEvents(subreddit) {
  subreddit.on('fetch-finish', () => {
    const { name, icon, banner } = subreddit.info
    localData = localData.map((data) =>
      equalsIgnoreCase(data.name, name) ? { ...data, name, icon, banner } : data
    )
    save()
  })
  subreddit.once('html-load', () => changeCurrentIcon())
  subreddit.on('sort-change', (sort) => {
    localData = localData.map((data) =>
      equalsIgnoreCase(data.name, subreddit.info.name)
        ? { ...data, sort }
        : data
    )
    save()
  })
  subreddit.on('remove', () => {
    subreddits.splice(subreddits.indexOf(subreddit), 1)
    icons[currIdx].remove()
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
    content.replaceWith(post.getContentHtmlElement())

    const setCommentList = () => {
      commentList.innerHTML = ''
      commentList.append(
        ...post.comments.flatMap((comment) => comment.getHtmlElements())
      )
    }
    const handleError = (err) => {
      console.error(err)
      const errorLi = document.createElement('li')
      errorLi.className = 'error'
      errorLi.innerText = `An error occurred while loading comments.${err?.message ? `\n${err.message}` : ''}`
      commentList.appendChild(errorLi)
    }

    if (!post.comments) {
      const loadButton = document.createElement('button')
      loadButton.innerText = 'Load comments'
      loadButton.onclick = () => {
        const loadingLi = document.createElement('li')
        loadingLi.className = 'loading'
        loadingLi.innerHTML = '<i class="fa-solid fa-spinner"></i>'
        li.replaceWith(loadingLi)
        post.loadComments().then(setCommentList).catch(handleError)
      }
      const li = document.createElement('li')
      li.appendChild(loadButton)
      commentList.appendChild(li)
    } else post.loadComments().then(setCommentList)

    postDialog.showModal()
  })
}

let localData = JSON.parse(localStorage.getItem('reddlist-subreddits') || '[]')
/** @type {Subreddit[]} */
const subreddits = localData.map((data) => {
  const { name, sort, icon, banner } = data
  return new Subreddit(name, icon, banner, sort)
})

function save() {
  localStorage.setItem('reddlist-subreddits', JSON.stringify(localData))
}

const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)

const main = document.querySelector('main')
const addDialog = document.querySelector('dialog.add')
const postDialog = document.querySelector('dialog.post')
const addButton = document.querySelector('button.add')
const iconListElement = document.querySelector('.icons')

const addIconElement = document.createElement('div')
addIconElement.innerText = '+'
addIconElement.onclick = () => {
  main.scroll(main.scrollWidth, 0)
  currIdx = subreddits.length
}
iconListElement.appendChild(addIconElement)

/** @type {Icon[]} */
const icons = []
let lastCurrentElement,
  currIdx = 0

function changeCurrentIcon() {
  let newCurrent
  if (currIdx >= subreddits.length) newCurrent = addIconElement
  else newCurrent = icons[currIdx].htmlElement

  lastCurrentElement.classList.remove('current')
  newCurrent.classList.add('current')
  lastCurrentElement = newCurrent

  iconListElement.style.left = `calc(50% - ${newCurrent.offsetLeft}px - 1rem)`
}

function addSubreddit() {
  const input = addDialog.querySelector('input')
  if (!input.value) return

  const newSubreddit = new Subreddit(input.value, null, null, 'hot')
  localData.push({ name: input.value, sort: 'hot' })
  save()

  subreddits.push(newSubreddit)

  document
    .querySelector('main>div:last-child')
    .before(newSubreddit.getHtmlElement())
  addIcon(newSubreddit)
  subredditEvents(newSubreddit)
  changeCurrentIcon()

  document.querySelector('.message')?.remove()
  input.value = ''
  addDialog.close()
}

/** @type {Subreddit} subreddit */
function addIcon(subreddit) {
  const newIcon = new Icon(subreddit, () => {
    currIdx = icons.indexOf(newIcon)
    main.scroll(subreddits[currIdx].htmlElement.offsetLeft - fontSize, 0)
  })
  newIcon.on('remove', () => icons.splice(currIdx, 1))
  icons.push(newIcon)
  addIconElement.before(newIcon.htmlElement)
}

document
  .querySelectorAll('dialog')
  .forEach(
    (dialog) =>
      (dialog.querySelector('button.close').onclick = () => dialog.close())
  )

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
      .before(subreddit.getHtmlElement())
    addIcon(subreddit)
    subredditEvents(subreddit)
  })

  const currentElement = subreddits.length
    ? icons[0].htmlElement
    : addIconElement
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
