/**
 * Module dependencies.
 */

const util = require('util');
const should = require('should');
const program = require('../');

const info = [];

console.error = function() {
  info.push(util.format.apply(util, arguments));
};

process.on('exit', function(code) {
  code.should.equal(1);
  info.length.should.equal(1);
  info[0].should.equal('error: option `-c, --cheese <type>` argument missing');
  process.exit(0);
});

program
  .version('0.0.1')
  .option('-c, --cheese <type>', 'optionally specify the type of cheese');

program.parse(['node', 'test', '--cheese']);
