var fs = require('fs');
var exec = require('child_process').exec;
var async = require('async');

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.initConfig({
    clean: ['cover_html', '.coverage_data']
  });

  grunt.registerTask('default', ['clean', 'test-cov']);

  grunt.registerTask('test-cov', 'Run test coverage report', function() {
    var testFiles;
    if (arguments.length === 0) {
      testFiles = fs.readdirSync('./test').filter(function(file) {
        return file.match(/.*\.test\.js$/);
      });
      grunt.log.writeln('Running full coverage');
    }
    else {
      testFiles = Array.prototype.slice.call(arguments);
      grunt.log.writeln('Running coverage for ' + testFiles.join(' '));
    }

    var done = this.async();
    async.series([
      function(callback) {
        async.each(testFiles, function(file, callback){
          grunt.log.writeln('covering ' + file + '...');
          exec('cover run test/' + file, function(err, stdout, stderr) {
            callback(err || stderr)
          });
        }, callback);
      },
      function(callback) {
        grunt.log.writeln('pause...');
        setTimeout(callback, 1000);
      },
      function(callback) {
        grunt.log.writeln('combining...');
        exec('cover combine', function(err, stdout, stderr) {
          callback(err || stderr);
        });
      },
      function(callback) {
        grunt.log.writeln('writing report...');
        exec('cover report html', function(err, stdout, stderr) {
          callback(err || stderr);
        });
      }
    ], function(err) {
      if (err)
        grunt.log.error(err);
      else
        grunt.log.writeln('Coverage report available in ./cover_html/index.html');
      done();
    });
  });
};
