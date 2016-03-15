var path = require('path');
var fs = require('fs');

const COVER = path.join('.', 'node_modules', '.bin', 'cover');
const TEST_DIR = path.join('.', 'test');
const SLEEP = 1000;   // delay between `cover run`s and `cover combine`

function cover(subCmd) {
  return COVER + ' ' + subCmd;
}

desc('Clean and run test coverage');
task('default', ['clean', 'test-cov']);

desc('Clean up');
task('clean', function () {
  var trash = [
    'cover_html',
    '.coverage_data'
  ];
  trash.forEach(function(item) {
    jake.rmRf(item);
  });
});

desc('Run coverage\n\tRun without arguments to cover all test\n\tjake test-cov[file1, file2, ...] to cover selected files');
task('test-cov', {async: true}, function () {

  function findTests(dir) {
    return new jake.FileList()
      .include(path.join(TEST_DIR, 'local/*.test.js'))
      .include(path.join(TEST_DIR, 'remote/*.test.js'))
      .toArray();
  }

  var args = Array.prototype.slice.apply(arguments);
  var files;
  if (args.length) {
    files = args;
  }
  else {
    files = findTests(TEST_DIR);
  }

  var coverCmds = files.map(function(file){
    return cover('run ' + file);
  });

  jake.logger.log('Executing commands:\n\t' + coverCmds.join('\n\t'));
  jake.exec(coverCmds, function() {
    jake.logger.log('Done.');
    // Sleeping seems to ensure that `cover combine` sees all of the runs
    setTimeout(function(){
      var cmds = [
        cover('combine'),
        cover('report html')
      ];
      jake.logger.log('Executing commands:\n\t' + cmds.join('\n\t'));
      jake.exec(cmds, function() {
        jake.logger.log('Done.');
        jake.logger.log('Coverage report available in cover_html/index.html');
        complete();
      });
    }, SLEEP);
  });
});