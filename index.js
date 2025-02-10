import { Subreddit } from './subreddit.js'

function subredditEvents(subreddit) {
  subreddit.on('sort-change', (sort) => {
    localData = localData.map((data) =>
      data.name === subreddit.info.name ? { ...data, sort } : data
    )
    save()
  })
  subreddit.on('remove', () => {
    subreddits.splice(subreddits.indexOf(subreddit), 1)
    localData = localData.filter((data) => data.name !== subreddit.info.name)
    save()
  })
}

function newSubredditEvents(newSubreddit) {
  newSubreddit.once('fetch-start', startLoading)
  newSubreddit.once('fetch-finish', () => {
    document
      .querySelector('main>div:last-child')
      .before(newSubreddit.getHTMLElement())

    finishLoading()
  })
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

function startLoading() {
  addButton.disabled = true
  addButton.innerHTML = '<i class="fa-solid fa-spinner"></i>'
}

function finishLoading() {
  addButton.disabled = false
  addButton.innerHTML = '+'
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

  const newSubreddit = new Subreddit(input.value, 'hot')
  localData.push({ name: input.value, sort: 'hot' })
  save()

  subreddits.push(newSubreddit)

  newSubredditEvents(newSubreddit)
  subredditEvents(newSubreddit)

  newSubreddit.fetchData()

  document.querySelector('.message')?.remove()
  input.value = ''
  addDialog.close()
}
addButton.onclick = () => addDialog.showModal()

window.onload = () => {
  messageDiv.innerText = 'Click here to add a subreddit'
  messageDiv.className = 'message'
  if (!subreddits.length) addButton.after(messageDiv)

  subreddits.forEach((subreddit) => {
    subredditEvents(subreddit)
    const element = subreddit.getHTMLElement()
    document.querySelector('main>div:last-child').before(element)

    const optionsButton = element.querySelector('button.options')
    if (!optionsButton) return
    optionsButton.onclick = (e) => {
      optionsMenu.openMenu(this, optionsButton)
      e.stopPropagation()
    }
  })
}

window.onclick = (e) => {
  if (
    optionsMenu.opened &&
    (e.clientX < optionsMenu.clientLeft ||
      e.clientY < optionsMenu.clientTop ||
      e.clientX > optionsMenu.clientLeft + optionsMenu.clientWidth ||
      e.clientY > optionsMenu.clientTop + optionsMenu.clientHeight)
  )
    optionsMenu.closeMenu()
}

document.querySelector('main').onscroll = () => optionsMenu.closeMenu()
document.querySelector('button.remove').onclick = (e) => {
  if (!optionsMenu.currentSubreddit) return

  optionsMenu.currentSubreddit.remove()
  optionsMenu.closeMenu()
  e.stopPropagation()
}
