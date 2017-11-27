module.exports = function(grunt) {
    var options = {
        styles: {
            main: 'dist/css/main.css'
        },
        scripts: {
            main: 'dist/js/main.js',
            admin: 'dist/admin/js/admin.js',
            libs: ['dist/js/libs.js', 'https://api-maps.yandex.ru/2.1/?lang=ru_RU']
            // libs: ['dist/js/libs.js']
        },
        beautify: true,
        sections: {
            toolbar: 'html/toolbar.html',
            details: 'html/details.html',
            map: 'html/map.html',
            comments: 'html/comments.html',
            anketa: 'html/anketa.html',
            static: 'html/static.html',
            header: 'html/header.html',
            search: 'html/search.html',
            rating: 'static-spb.html'
        }
    }
    grunt.initConfig({
        cssmin: {
            options: {
                mergeIntoShorthands: false,
                roundingPrecision: -1
            },
            target: {
                files: {
                    "dist/css/main.css": [
                      'css/reset.css',
                      'css/style.css',
                      'css/police.css',
                      'css/view.css',
                      'css/header.css',
                      'css/cards.css',
                      'css/static.css'
                    ]
                }
            }
        },
        uglify: {
            options: {
                beautify: true
            },
            my_target: {
                files: {
                    'dist/js/main.js': ['js/common/*.js', 'js/*.js'],
                    'dist/js/common.js': ['js/common/*.js', 'js/api-types.js', 'js/api.js', 'js/db-api.js', 'js/history-api.js'],
                    'dist/js/libs.js': ['libs/*.js'],
                    'dist/admin/js/admin.js': ['admin/js/*.js']
                }
            }
        },
        copy: {
            main: {
                files: [
                    { expand: true, src: ['css/fonts/**'], dest: 'dist/' },
                    { expand: true, src: ['css/libs/**'], dest: 'dist/' },
                    { expand: true, src: ['css/img/**'], dest: 'dist/' },
                    { expand: true, src: ['css/static.css'], dest: 'dist/' },
                    { expand: true, src: ['css/style.css'], dest: 'dist/' },
                    { expand: true, src: ['css/pages.css'], dest: 'dist/' },
                    { expand: true, src: ['data/**'], dest: 'dist/' },
                    { expand: true, src: ['admin/php/**'], dest: 'dist/' },
                    { expand: true, src: ['html/info/**'], dest: 'dist/' },
                    { expand: true, src: ['js/static/**'], dest: 'dist/' },
                    { expand: true, src: ['libs/**'], dest: 'dist/' },
                ],
            }
        },
        htmlbuild: {
            dist: {
                src: ['*.html'],
                dest: 'dist/',
                options: options
            },
            admin: {
                src: ['admin/*.html'],
                dest: 'dist/admin/',
                options: options
            }
        }

    });
    grunt.loadNpmTasks('grunt-contrib-copy');
    //grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-html-build');
    grunt.registerTask('default', ['copy', 'uglify', 'cssmin', 'htmlbuild']);
    grunt.registerTask('build', ['htmlbuild']);
};