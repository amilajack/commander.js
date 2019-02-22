const should = require('should');
const { default: program } = require('../dist/index.js');

let capturedExitCode;
let capturedOutput;
let oldProcessExit;
let oldProcessStdoutWrite;

program.version('0.0.1', '-r, --revision').description('description');

['-r', '--revision'].forEach(function(flag) {
  capturedExitCode = -1;
  capturedOutput = '';
  oldProcessExit = process.exit;
  oldProcessStdoutWrite = process.stdout.write;
  process.exit = function(code) {
    capturedExitCode = code;
  };
  process.stdout.write = function(output) {
    capturedOutput += output;
  };
  program.parse(['node', 'test', flag]);
  process.exit = oldProcessExit;
  process.stdout.write = oldProcessStdoutWrite;
  capturedOutput.should.equal('0.0.1\n');
  capturedExitCode.should.equal(0);
});
