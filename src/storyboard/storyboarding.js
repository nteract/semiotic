export default class StoryBoarder {
    constructor({ chapters=[], transition={ time: 1000 } }) {
        this._chapters = chapters
        this._transition = transition
        this._currentTimer = 0
    }

    startTimer() {
        console.log("setTimeout?")
    }

    get chapters() {
        console.log("get chapters")
    }

    set chapters(newChapters) {
        console.log("set chapters", newChapters)
    }

}
