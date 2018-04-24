export default class StoryBoarder {
  constructor({ chapters = [], transition = { time: 1000 } }) {
    this._chapters = chapters
    this._transition = transition
    this._currentTimer = 0
  }

  startTimer() {
    //        console.info('setTimeout?')
    return null
  }

  get chapters() {
    //        console.info('get chapters')
    return null
  }

  set chapters(newChapters) {
    //        console.info('set chapters', newChapters)
    return newChapters
  }
}
