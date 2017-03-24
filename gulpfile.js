var gulp = require('gulp'),
    sass = require('gulp-sass'),
    browserSync = require('browser-sync').create(),
    htmlInjector = require('bs-html-injector'),
    csso = require('gulp-csso'),
    rename = require('gulp-rename'),
    sourcemaps = require('gulp-sourcemaps'),
    autoprefixer = require('gulp-autoprefixer'),
    del = require('del'),
    spritesmith = require('gulp.spritesmith'),
    buffer = require('vinyl-buffer'),
    imagemin = require('gulp-imagemin'),
    svgSprite = require('gulp-svg-sprite'),
    plumber = require('gulp-plumber'),
    merge = require('merge-stream'),
    // babel = require('gulp-babel'),
    // concat = require('gulp-concat'),
    uncss = require('gulp-uncss'),
    webpack = require('webpack-stream'),


    baseDir = 'src/img/icons-svg',
    svgGlob = '**/*.svg',
    outDir = 'src',


    config = {
        'log': 'verbose',
        'mode': {
            'css': {
                'dest': '.',
                'common': 'svg-icon',
                'sprite': 'img/sprite.css.svg',
                'bust': false,
                'render': {
                    'scss': {
                        'template': 'src/tmpl/gulp-svg-sprite.scss',
                        'dest': 'scss/utils/_svg-sprite.scss'
                    }
                },
                'example': true
            },
            'stack': {
                'dest': '.',
                'sprite': 'img/sprite.stack.svg',
                'bust': false,
                'example': true
            }
        }
    };



gulp.task('svgsprite', function () {
    return gulp.src(svgGlob, {cwd: baseDir})
        .pipe(plumber())
        .pipe(svgSprite(config)).on('error', function (error) {
            console.log(error);
        })
        .pipe(gulp.dest(outDir));
});

/* Тестирование стилей на предмет неиспользования в разметке */
gulp.task('uncss', function () {
    return gulp.src('./src/css/main.css')
        .pipe(uncss({
            html: ['./src/*.html'],
            timeout: 5000,
            report: true
        }))
        .pipe(gulp.dest('./test'));
});

gulp.task('sass', function () {
    return gulp.src('./src/scss/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer(['last 3 versions', '> 2%', 'ie >= 8'], {cascade: true}))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./src/css'))
        .pipe(browserSync.stream());
});

gulp.task('webpack', function () {
    return gulp.src('./src/scripts/modules/*.js')
        .pipe(webpack({
            // watch: true,
            context: __dirname + '/src/scripts/modules',
            entry: {
                mainApp: './mainApp.js'
            },
            output: {
                filename: '[name].js'
            },
            module: {
                loaders: [
                    {
                        test: /\.js$/,
                        exclude: /node_modules/,
                        loader: 'babel-loader'
                    }
                ]
            },
            devtool: 'source-map'
        }))
        .pipe(gulp.dest('./src/scripts/'))
        .pipe(browserSync.stream());
});

gulp.task('imagemin', function () {
    return gulp.src('./src/img/**')
        .pipe(imagemin({verbose: true}))
        .pipe(gulp.dest('./src/img/'))
});


gulp.task('csso', ['sass'], function () {
    return gulp.src('./src/css/*.css')
        .pipe(csso({
            restructure: true
        }))
        // .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('./src/css/min'));
});


gulp.task('sprite', function () {
    var spriteData = gulp.src('./src/img/icons/*.png').pipe(spritesmith({
        imgName: 'sprite.png',
        cssName: '_sprites.scss',
        imgPath: '../img/sprite.png'
    }));

    var imgStream = spriteData.img
        .pipe(buffer())
        .pipe(imagemin())
        .pipe(gulp.dest('./src/img/'));

    var cssStream = spriteData.css
        .pipe(gulp.dest('./src/scss/utils'));

    return merge(imgStream, cssStream);
});


gulp.task('watch', ['sass', 'webpack'], function () {
    browserSync.use(htmlInjector, {
        files: './src/*.html'
    });
    browserSync.init({
        server: {
            baseDir: './src'
        },
        notify: false
    });

    gulp.watch('src/scss/**/*.scss', ['sass']);
    gulp.watch('src/css/**/*.css', htmlInjector)/*.on('change', browserSync.reload)*/;
    gulp.watch('./src/*.html', htmlInjector)/*.on('change', browserSync.reload)*/;
    gulp.watch('./src/scripts/modules/*.js', ['webpack']).on('change', browserSync.reload);
});

gulp.task('clean', function () {
    return del.sync('dist');
});

gulp.task('build', ['clean', 'csso'], function () {
    var buildCss = gulp.src([
        './src/css/min/*.css'
    ])
        .pipe(gulp.dest('./dist/css'));
    var buildFonts = gulp.src('./src/fonts/**/*')
        .pipe(gulp.dest('./dist/fonts'));
    var buildJs = gulp.src(['./src/scripts/**/*', '!./src/scripts/vue.js']) // Исключаем vue.js для замены на production-версию
        .pipe(gulp.dest('./dist/scripts'));
    var buildJsVue = gulp.src('./src/scripts/vue.min.js') // Переименовывыем минифицированный файл соответсвия пути к нему в html
        .pipe(rename('vue.js'))
        .pipe(gulp.dest('./dist/scripts'));
    var buildHtml = gulp.src('./src/*.html')
        .pipe(gulp.dest('./dist'));
    var buildImg = gulp.src(['./src/img/**', '!./src/img/sprite.css.svg', '!./src/img/sprite.stack.svg'])
        .pipe(imagemin({verbose: true}))
        .pipe(gulp.dest('./dist/img'));
    var buildSvg = gulp.src('./src/img/sprite*.svg')
        .pipe(gulp.dest('./dist/img'));
});

gulp.task('default', ['watch']);
