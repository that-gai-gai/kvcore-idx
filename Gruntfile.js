'use strict';

module.exports = function (grunt) {

    // Show elapsed time after tasks run to visualize performance
    require('time-grunt')(grunt);
    // Load all Grunt tasks that are listed in package.json automagically
    require('load-grunt-tasks')(grunt);

    let frontendScriptFiles = [
	    'public/js/polyfill.js',
	    'node_modules/object-fit-images/dist/ofi.min.js',
	    'node_modules/bootstrap/js/dist/util.js',
	    'node_modules/bootstrap/js/dist/collapse.js',
	    // 'node_modules/bootstrap/js/dist/modal.js',
	    'public/bootstrap/js/dist/modal.js',
	    'node_modules/form-serializer/dist/jquery.serialize-object.min.js',
	    'public/js/_lib/*.js',
	    'public/js/frontend.js',
	    'public/js/frontend/util/*.js',
	    'public/js/frontend/trigger.js',
        'public/js/frontend/page/properties.js',
        'public/js/frontend/page/team.js',
        'public/js/frontend/page/offices.js',
        'public/js/frontend/page/area-pages.js',
	    'public/js/frontend/element/*.js',
	    'public/js/views/*.js'
    ];

    let adminScriptFiles = [
	    'public/js/polyfill.js',
	    'node_modules/bootstrap/js/dist/util.js',
	    'node_modules/bootstrap/js/dist/collapse.js',
	    // 'node_modules/bootstrap/js/dist/modal.js',
	    'public/bootstrap/js/dist/modal.js',
	    'node_modules/form-serializer/dist/jquery.serialize-object.min.js',
	    'node_modules/select2/dist/js/select2.full.min.js',
        'public/js/_lib/twig.min.js',
	    'public/js/frontend.js',
	    'public/js/frontend/util/config.js',
	    'public/js/frontend/util/form.js',
	    'public/js/frontend/util/message.js',
	    'public/js/frontend/util/remote.js',
	    'public/js/frontend/util/search.js',
	    'public/js/frontend/util/storage.js',
	    'public/js/frontend/util/view.js',
	    'public/js/frontend/util/url.js',
	    'public/js/views/modal.js',
	    'admin/js/*.js',
	    'admin/js/settings/*.js',
        'admin/js/views/*.js',
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        // shell commands for use in Grunt tasks
        shell: {
            buildTwigViews: {
		        command: [
		            'composer install -d ./includes',
		            'php build.php',
			        'echo "$(tput setaf 2)Twig views built!$(tput sgr0)"'
                ].join('&&')
	        }
        },

        uglify:{
	        options: {
		        mangle: false,
		        banner: "/*! <%= pkg.name %> - v<%= pkg.version %> - " +
                        "<%= grunt.template.today('yyyy-mm-dd') %> */\n" +
                        "if('undefined'===typeof($)){$=jQuery}"
	        },
            kvcoreidx: {
                options: {
                    sourceMap: true
                },
                files: {
                    'public/js/dist/frontend.min.js':frontendScriptFiles
                }
            },
            kvcoreidxAdmin: {
	            options: {
		            sourceMap: true
	            },
	            files: {
		            'admin/js/dist/admin.min.js':adminScriptFiles
	            }
            }
        },

        // watch for files to change and run tasks when they do
        watch: {
            sass: {
                files: ['public/sass/**/*.{scss,sass}','admin/sass/**/*.{scss,sass}','public/bootstrap/sass/**/*.{scss,sass}'],
                tasks: ['sass']
            },
            twig: {
                files: [ 'public/partials/*.twig', 'admin/partials/*.twig'],
                tasks: [ 'shell:buildTwigViews' ]
            },
            uglify: {
                files: frontendScriptFiles,
                tasks: [ 'uglify:kvcoreidx' ]
            },
            uglifyAdmin: {
                files: adminScriptFiles,
                tasks: [ 'uglify:kvcoreidxAdmin' ]
            }
        },

        // sass (libsass) config
        sass: {
            options: {
                sourceMap: true,
                relativeAssets: false,
                outputStyle: 'compressed',
                sassDir: 'public/sass',
                cssDir: 'public/css',
                includePaths: [
                    'node_modules',
                    'public/sass'
                ]
            },
            build: {
                files: [{
                    expand: true,
                    cwd: 'public/sass/',
                    src: ['**/*.{scss,sass}'],
                    dest: 'public/css',
                    ext: '.css'
                },{
                    expand: true,
                    cwd: 'admin/sass/',
                    src: ['**/*.{scss,sass}'],
                    dest: 'admin/css',
                    ext: '.css'
                }]
            }
        },

        // run tasks in parallel
        concurrent: {
            serve: [
                'sass',
                'watch'
            ],
            options: {
                logConcurrentOutput: true
            }
        }
    });

    // Register the grunt build task
    grunt.registerTask('build', [
        'sass',
        'shell:buildTwigViews',
        'uglify'
    ]);

    // Register build as the default task fallback
    grunt.registerTask('default', 'build');

};
