/**
 * @typedef {(...args?: any[]) => void} ListenerFunc
 */

export class Listener {
  /**
   * @param {{name: string, args?: string[]}[]} events
   */
  constructor(events) {
    /** @type {Object.<string, ListenerFunc[]>} */
    this.listeners = {}
    /** @type {Object.<string, string[]>} */
    this.args = {}

    for (let event of events) {
      this.listeners[event.name] = []
      this.args[event.name] = event.args || []
    }
  }

  /**
   * @param {string} event
   * @param {any?} args
   */
  notify(event, args) {
    for (let arg of this.args[event]) {
      if (args?.[arg] === undefined)
        throw new Error(`${event}: '${arg}' 값이 설정되지 않았습니다.
(값이 필요 없는 상황이라면 null로 설정하세요.)`)
    }

    this.listeners[event]?.forEach((listener) => {
      listener(...this.args[event].map((arg) => args[arg]))

      if (listener.once) this.removeListener(event, listener)
    })
  }

  /**
   * @param {string} event
   * @param {ListenerFunc} listener
   */
  on(event, listener) {
    if (!this.listeners[event])
      throw new Error(`'${event}'는 존재하지 않는 이벤트입니다.`)
    else if (!listener) throw new Error('listener 함수가 설정되지 않았습니다.')
    this.listeners[event].push(listener)
  }

  /**
   * @param {string} event
   * @param {ListenerFunc} listener
   */
  once(event, listener) {
    listener.once = true
    this.on(event, listener)
  }

  /**
   * @param {string} event
   * @param {ListenerFunc} listener
   */
  removeListener(event, listener) {
    if (!this.listeners[event] || !this.listeners.includes(listener)) return

    this.listeners[event].splice(this.listeners[event].indexOf(listener), 1)
  }
}
