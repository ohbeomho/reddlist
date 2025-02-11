import { Subreddit } from './subreddit.js'

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
    changeIcon(subreddit, subreddits.indexOf(subreddit))
    save()
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
    subreddits.splice(subreddits.indexOf(subreddit), 1)
    localData = localData.filter(
      (data) => !equalsIgnoreCase(data.name, subreddit.info.name)
    )
    removeIcon(subreddits.indexOf(subreddit))
    save()
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

function addIcon(subreddit) {
  const icon = subreddit.htmlElement.querySelector('.icon')
  const newIcon = icon.cloneNode()
  newIcon.innerHTML = icon.innerHTML
  addIconElement.before(newIcon)
  iconElements.push(newIcon)
  newIcon.onclick = () => {
    currIdx = iconElements.indexOf(newIcon)
    main.scroll(subreddits[currIdx].htmlElement.offsetLeft - fontSize, 0)
  }
}

function changeIcon(subreddit, idx) {
  const icon = subreddit.htmlElement.querySelector('.icon')
  const newIcon = icon.cloneNode()
  newIcon.innerHTML = icon.innerHTML

  iconElements[idx].replaceWith(newIcon)
  iconElements.splice(idx, 1, newIcon)
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

  const newSubreddit = new Subreddit(input.value, null, null, 'hot')
  localData.push({ name: input.value, sort: 'hot' })
  save()

  subreddits.push(newSubreddit)
  subredditEvents(newSubreddit)

  document
    .querySelector('main>div:last-child')
    .before(newSubreddit.getHTMLElement())
  addIcon(newSubreddit)
  changeCurrentIcon()

  document.querySelector('.message')?.remove()
  input.value = ''
  addDialog.close()
}
addButton.onclick = () => addDialog.showModal()

window.onload = () => {
  if (!subreddits.length) {
    const messageDiv = document.createElement('div')
    messageDiv.innerText = 'Click here to add a subreddit'
    messageDiv.className = 'message'
    addButton.after(messageDiv)
  }

  subreddits.forEach((subreddit) => {
    subredditEvents(subreddit)
    document
      .querySelector('main>div:last-child')
      .before(subreddit.getHTMLElement())
    addIcon(subreddit)
  })

  iconElements[0].classList.add('current')
  lastCurrentElement = iconElements[0]
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
