var gulp = require('gulp'),
    sass = require('gulp-sass'),
    browserSync = require('browser-sync'),
    csso = require('gulp-csso'),
    rename = require('gulp-rename'),
    sourcemaps = require('gulp-sourcemaps'), // Sourcemaps для использования совместно с автопрефиксером
    autoprefixer = require('gulp-autoprefixer'),
    del = require('del'), // Подключаем библиотеку для удаления файлов и папок
    spritesmith = require('gulp.spritesmith'),
    buffer = require('vinyl-buffer'),
    imagemin = require('gulp-imagemin'),
    svgSprite    = require('gulp-svg-sprite'),
    plumber      = require('gulp-plumber'),
    merge = require('merge-stream'),

    /* Следующий блок переменных задает параметры директорий для gulp-svg-sprite */
    baseDir      = './app/img/icons-svg',   // <-- Set to your SVG base directory
    svgGlob      = '**/*.svg',       // <-- Glob to match your SVG files
    outDir       = '.',     // <-- Main output directory

    /* Конфигурация для gulp-svg-sprite */
    config       = {
        "log": "verbose", // Смотрим лог куда какие файлы упали
        "mode": {
            "css": { // Создаем CSS-спрайт
                "dest": "app",
                "common": "icon", // Предпочтительная приставка для класса имени иконки
                "sprite": "img/sprite.css.svg",
                "bust": false,
                "render": { // CSS отключен, используем SASS для сборки
                    "scss": {
                        "dest": "scss/utils/_svg-sprite.scss"
                    }
                },
                "example": true
            },
            "stack": { // Создаем stack-спрайт (http://simurai.com/blog/2012/04/02/svg-stacks)
                "dest": "./app",
                "sprite": "./img/sprite.stack.svg",
                "bust": false,
                "example": true
            }
        }
    };


// Таск для создания SVG-спрайта
gulp.task('svgsprite', function() {
    return gulp.src(svgGlob, {cwd: baseDir})
        .pipe(plumber())
        .pipe(svgSprite(config)).on('error', function(error){ console.log(error); })
        .pipe(gulp.dest(outDir))
});

// Таск для рендеринга SASS
gulp.task('sass', function () {
    return gulp.src('./app/scss/**/*.scss')
        .pipe(sourcemaps.init()) // Инициализируем sourcemaps
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer(['last 3 versions', '> 2%', 'ie >= 8'], { cascade: true }))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./app/css'))
        .pipe(browserSync.stream());
});


// Таск для минификации изображений (помимо него минификатор вызывается во время сборки спрайтов)
gulp.task('imagemin', function () {
    return gulp.src('./app/img/**')
        .pipe(imagemin({verbose: true}))
        .pipe(gulp.dest('./app/img/'))
});

// Задача для минификации css (запускается в build)
gulp.task('csso', ['sass'], function() {
    return gulp.src('./app/css/*.css') // Выбираем файл для минификации
        .pipe(csso({
            restructure: true
        })) // Сжимаем
        // .pipe(rename({suffix: '.min'})) // Добавляем суффикс .min (опционально)
        .pipe(gulp.dest('./app/css/min')); // Выгружаем в папку css
});


gulp.task('sprite', function () {
    // Generate our spritesheet
    var spriteData = gulp.src('./app/img/icons/*.png').pipe(spritesmith({
        imgName: 'sprite.png',
        cssName: '_sprites.scss',
        imgPath: '../img/sprite.png'
    }));

    // Pipe image stream through image optimizer and onto disk
    var imgStream = spriteData.img
    // DEV: We must buffer our stream into a Buffer for `imagemin`
        .pipe(buffer())
        .pipe(imagemin())
        .pipe(gulp.dest('./app/img/'));

    // Pipe CSS stream through CSS optimizer and onto disk
    var cssStream = spriteData.css
        .pipe(gulp.dest('./app/scss/utils'));

    // Return a merged stream to handle both `end` events
    return merge(imgStream, cssStream);
});


gulp.task('watch', ['sass'], function () {

    browserSync.init({ // Выполняем browser Sync
        server: { // Определяем параметры сервера
            baseDir: './app' // Директория для сервера
        },
        notify: false // Отключаем уведомления
    });

    gulp.watch('app/scss/**/*.scss', ['sass']);
    gulp.watch('./app/*.html').on('change', browserSync.reload); // Наблюдение за HTML файлами
    // gulp.watch('./app/js/**/*.js', browserSync.reload); // Наблюдение за JS файлами в папке js
    gulp.watch('./app/js/**/*.js').on('change', browserSync.reload);

});


gulp.task('clean', function() {
    return del.sync('dist'); // Удаляем папку dist перед сборкой
});


gulp.task('build', ['clean', 'csso'], function() {
    var buildCss = gulp.src([ // Переносим CSS стили в продакшен
        './app/css/min/*.css'
    ])
        .pipe(gulp.dest('./dist/css'));
    var buildFonts = gulp.src('./app/fonts/**/*') // Переносим шрифты в продакшен
        .pipe(gulp.dest('./dist/fonts'));
    var buildJs = gulp.src('./app/js/**/*') // Переносим скрипты в продакшен
        .pipe(gulp.dest('./dist/js'));
    var buildHtml = gulp.src('./app/*.html') // Переносим HTML в продакшен
        .pipe(gulp.dest('./dist'));
    var buildImg = gulp.src('./app/img/*') // Переносим изображения в продакшен
        .pipe(imagemin({verbose: true})) // Сжимаем изображения
        .pipe(gulp.dest('./dist/img'));
});

gulp.task('default', ['watch']); // Дефолтный таск