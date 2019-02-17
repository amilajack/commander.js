const should = require('should');
const program = require('../');

let error;

try {
  program.command('fail').alias('fail');
} catch (e) {
  error = e;
}

error.should.deepEqual(
  new Error("Command alias can't be the same as its name")
);
