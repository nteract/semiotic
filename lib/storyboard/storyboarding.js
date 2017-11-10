"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StoryBoarder = function () {
  function StoryBoarder(_ref) {
    var _ref$chapters = _ref.chapters,
        chapters = _ref$chapters === undefined ? [] : _ref$chapters,
        _ref$transition = _ref.transition,
        transition = _ref$transition === undefined ? { time: 1000 } : _ref$transition;

    _classCallCheck(this, StoryBoarder);

    this._chapters = chapters;
    this._transition = transition;
    this._currentTimer = 0;
  }

  _createClass(StoryBoarder, [{
    key: "startTimer",
    value: function startTimer() {
      //        console.log('setTimeout?')
      return null;
    }
  }, {
    key: "chapters",
    get: function get() {
      //        console.log('get chapters')
      return null;
    },
    set: function set(newChapters) {
      //        console.log('set chapters', newChapters)
      return newChapters;
    }
  }]);

  return StoryBoarder;
}();

exports.default = StoryBoarder;
module.exports = exports['default'];