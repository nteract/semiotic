var gulp = require('gulp');
var initGulpTasks = require('react-component-gulp-tasks');

var taskConfig = {
    component: {
        file: 'index.js',
        name: 'index',
        dependencies: [
            'react-bootstrap',
            'moment',
            'react',
            'react-dom'
        ],
        less: {
            path: 'less',
            entry: 'default.less'
        }
    },

    example: {
        src: 'examples/src',
        dist: 'examples/dist',
        files: [
            'index.html',
            'scrolly.html'
        ],
        scripts: [
            'app.js',
            'app_scrolly.js'
        ],
        less: [
            'example.less'
        ]
    }
}

initGulpTasks(gulp, taskConfig)
