"use strict";

module.exports = function( grunt ) {
    var JS_INCLUDE = [ "**/*.js", "!node_modules/**", "!test/**/*.spec.js", "!**/*.min.js", "!public/lib/**/*.js" ];
    // show elapsed time at the end
    require( 'time-grunt' )( grunt );
    // load all grunt tasks
    require( 'load-grunt-tasks' )( grunt );

    grunt.initConfig( {
        pkg: grunt.file.readJSON( 'package.json' ),
        concurrent: {
            develop: {
                tasks: [ 'nodemon', 'watch' ],
                options: {
                    logConcurrentOutput: true
                }
            }
        },
        nodemon: {
            dev: {
                script: 'app.js',
                options: {
                    //nodeArgs: [ '--debug' ],
                    callback: function( nodemon ) {
                        nodemon.on( 'restart', function() {
                            setTimeout( function() {
                                require( 'fs' ).writeFileSync( '.rebooted', 'rebooted' );
                            }, 1000 );
                        } );
                    },
                    env: {
                        NODE_ENV: 'development',
                        DEBUG: '*, -express:*, -send, -compression, -body-parser:*'
                    }
                }
            }
        },
        sass: {
            compile: {
                cwd: 'app/views/styles',
                dest: 'public/css',
                expand: true,
                outputStyle: 'compressed',
                src: '**/*.scss',
                ext: '.css',
                flatten: true,
                extDot: 'last'
            }
        },
        watch: {
            sass: {
                files: [ '.rebooted', 'config/config.json', 'app/views/styles/**/*.scss', 'app/lib/enketo-core/src/**/*.scss', 'app/views/**/*.jade' ],
                tasks: [ 'sass' ],
                options: {
                    spawn: true,
                    livereload: true
                }
            },
            language: {
                files: [ 'app/views/**/*.jade', 'app/controllers/**/*.js', 'app/models/**/*.js', 'public/js/src/**/*.js' ],
                tasks: [ 'shell:translation' ]
            },
            js: {
                files: [ 'node_modules/enketo-core/**/*.js', 'public/js/**/*.js' ],
                tasks: [ 'browserify' ],
                options: {
                    spawn: true,
                    livereload: true
                }
            }
        },
        shell: {
            translation: {
                command: [
                    'cd locales',
                    'gulp',
                    'cd ..'
                ].join( '&&' )
            }
        },
        jsbeautifier: {
            test: {
                src: JS_INCLUDE,
                options: {
                    config: "./.jsbeautifyrc",
                    mode: "VERIFY_ONLY"
                }
            },
            fix: {
                src: JS_INCLUDE,
                options: {
                    config: "./.jsbeautifyrc"
                }
            }
        },
        jshint: {
            options: {
                jshintrc: ".jshintrc"
            },
            all: JS_INCLUDE
        },
        // test server JS
        mochaTest: {
            all: {
                options: {
                    reporter: 'dot'
                },
                src: [ 'test/server/**/*.spec.js' ]
            },
            account: {
                src: [ 'test/server/account-*.spec.js' ]
            }
        },
        // test client JS
        karma: {
            options: {
                singleRun: true,
                reporters: [ 'dots' ]
            },
            headless: {
                configFile: 'test/client/config/headless-karma.conf.js',
                browsers: [ 'PhantomJS' ]
            },
            browsers: {
                configFile: 'test/client/config/browser-karma.conf.js',
                browsers: [ 'Chrome', 'ChromeCanary', 'Firefox', 'Opera', /*'Safari'*/ ]
            }
        },
        browserify: {
            all: {
                files: {
                    'public/js/enketo-webform-bundle.js': [ 'public/js/src/main-webform.js' ],
                    'public/js/enketo-webform-edit-bundle.js': [ 'public/js/src/main-webform-edit.js' ]
                },
            },
            options: {
                alias: {}
            },
        },
        uglify: {
            all: {
                files: {
                     'public/js/enketo-webform-bundle.min.js': [  'public/js/enketo-webform-bundle.js' ],
                     'public/js/enketo-webform-edit-bundle.min.js': [  'public/js/enketo-webform-edit-bundle.js' ],
                },
            },
        },
        env: {
            test: {
                NODE_ENV: 'test'
            }
        }
    } );

    grunt.registerTask( 'client-config-file', 'Temporary client-config file', function( task ) {
        var clientConfigPath = "public/temp-client-config.json";
        if ( task === 'create' ) {
            var config = require( './app/models/config-model' );
            grunt.file.write( clientConfigPath, JSON.stringify( config.client ) );
            grunt.log.writeln( 'File ' + clientConfigPath + ' created' );
        } else if ( task === 'remove' ) {
            grunt.file.delete( clientConfigPath );
            grunt.log.writeln( 'File ' + clientConfigPath + ' removed' );
        }
    } );

    grunt.registerTask( 'default', [ 'sass', 'compile', 'uglify' ] );
    grunt.registerTask( 'compile', [ 'client-config-file:create', 'browserify', 'client-config-file:remove' ] );
    grunt.registerTask( 'test', [ 'env:test', 'symlink', 'compile', 'mochaTest:all', 'karma:headless', 'jsbeautifier:test', 'jshint' ] );
    grunt.registerTask( 'develop', [ 'concurrent:develop' ] );
};
