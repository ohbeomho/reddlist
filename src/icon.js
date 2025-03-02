import { Subreddit } from './subreddit'
import { Listener } from './listener'

export class Icon extends Listener {
  /**
   * @param {Subreddit} subreddit
   * @param {() => void} onclick
   */
  constructor(subreddit, onclick) {
    super([{ name: 'remove' }])
    this.subreddit = subreddit
    this.onclick = onclick
    this.update()
  }

  update() {
    const prevElement = this.htmlElement
    const iconElement = this.subreddit.htmlElement.querySelector('.icon')
    this.htmlElement = iconElement.cloneNode()
    this.htmlElement.innerHTML = iconElement.innerHTML
    this.htmlElement.onclick = this.onclick
    prevElement?.replaceWith(this.htmlElement)
  }

  remove() {
    this.htmlElement.remove()
    this.notify('remove')
  }
}
