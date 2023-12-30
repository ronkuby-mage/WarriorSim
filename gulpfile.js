var gulp = require('gulp');
var cssnano = require('gulp-cssnano');
var sass = require('gulp-sass');
var minify = require('gulp-minify');
var rename = require('gulp-rename');
var stripCode = require('gulp-strip-code');
var browser = require('browser-sync').create();

gulp.task("js", function () {
    return gulp
        .src(["js/**/*.js", "lib/*.mjs"])
        .pipe(rename(function (path) {
            path.extname = ".min.js";
        }))
        .pipe(gulp.dest("dist/js"));
});

gulp.task("js-build", function () {
    return gulp
        .src(["js/**/*.js", "lib/*.mjs"])
        // .pipe(stripCode({
        //     start_comment: "start-log",
        //     end_comment: "end-log"
        //   }))
        // .pipe(
        //     minify({
        //         noSource: true,
        //         ext: {
        //             min: ".min.js",
        //         },
        //     })
        // )
        .pipe(gulp.dest("dist/js"));
});

gulp.task("sass", function () {
    return gulp
        .src("scss/style.scss")
        .pipe(sass())
        .pipe(cssnano())
        .pipe(gulp.dest("dist/css"));
});

gulp.task("browser", function () {
    browser.init({
        server: {
            baseDir: "./",
        },
    });
    gulp.watch("scss/*.scss", gulp.series(["sass"]));
    gulp.watch("js/**/*.js", gulp.series(["js"]));
});

gulp.task("default", gulp.series(["sass", "js", "browser"]));