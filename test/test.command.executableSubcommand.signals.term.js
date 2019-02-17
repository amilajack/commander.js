const { spawn } = require('child_process');
const path = require('path');
const should = require('should');

const bin = path.join(__dirname, './fixtures/pm');
const proc = spawn(bin, ['listen'], {});

let output = '';
proc.stdout.on('data', function(data) {
  output += data.toString();
});

// Set a timeout to give 'proc' time to setup completely
setTimeout(function() {
  proc.kill('SIGTERM');

  // Set another timeout to give 'prog' time to handle the signal
  setTimeout(function() {
    output.should.equal('SIGTERM\n');
  }, 1000);
}, 2000);
