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

const addDialog = document.querySelector('dialog.add')
const addButton = document.querySelector('button.add')

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
  })
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

    const scrollAmount =
      (window.innerWidth - fontSize) * (xdiff / Math.abs(xdiff))
    document
      .querySelector('main')
      .scrollBy({ left: scrollAmount, top: 0, behavior: 'smooth' })

    touchStart.x = -1
    touchStart.y = -1
  }
}
