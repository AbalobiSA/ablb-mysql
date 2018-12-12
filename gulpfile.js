let gulp = require("gulp");
const bump = require('gulp-bump');

function defaultTask(cb) {
    increasePackageVersion()
        .then(done => console.log("done!"))
        .catch(ex => {
            console.log(ex);
        });
    cb();
}

gulp.task("default", gulp.series(defaultTask));

const increasePackageVersion = () => {
    return new Promise((resolve, reject) => {
        gulp.src('./package.json')
            .pipe(bump())
            .pipe(gulp.dest("./"))
            .on('end', resolve)
    });
};