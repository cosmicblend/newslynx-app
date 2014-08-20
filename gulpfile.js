var gulp = require('gulp');

var plumber = require('gulp-plumber');
var uglify = require('gulp-uglifyjs');
var nodemon = require('gulp-nodemon');
var jshint = require('gulp-jshint');

var paths = {
	js: 		[
					'lib/public/javascripts/helpers/*.js',
					'lib/public/javascripts/models/*.js',
					'lib/public/javascripts/collections/*.js',
					'lib/public/javascripts/app/*.js',
					'lib/public/javascripts/views/*.js',
					'lib/public/javascripts/routing/*.js',
					'lib/public/javascripts/main.js'
					],
	css:    ['lib/public/stylesheets/*.styl'],
	jade:   [
					'lib/public/views/*.jade',
					'lib/public/views/page-divisions/content/*.jade',
					'lib/public/views/page-divisions/drawer/*.jade',
					'lib/public/views/page-divisions/left-rail/*.jade'
					]
};

// gulp.task('server', function() {
// 	nodemon({ script: 'bin/www' });
// });

gulp.task('lintjs', function() {
	return gulp.src(paths.js)
		.pipe(plumber())
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
});

gulp.task('uglify', function() {
	return gulp.src(paths.js)
		.pipe(uglify('main.bundled.js', {
			// outSourceMap: true
			mangle: false,
			output: {
				beautify: true
			}
		}))
		.pipe(gulp.dest('lib/public/javascripts'))
});

gulp.task('watch', function() {
	gulp.watch(paths.js, ['uglify']);
});

gulp.task('demon', function () {
	nodemon({
		script: 'bin/www',
		ext: 'js jade styl json',
		ignore: ["main.bundled.js"]
  })
	.on('start', ['uglify', 'watch'])
	.on('change', ['uglify', 'watch'])
	.on('restart', function () {
		console.log('Gulp restarted!');
	});
});

gulp.task('default', ['uglify', 'demon']);
// gulp.task('default', ['server',  'watch']);
