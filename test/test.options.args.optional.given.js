/**
 * Module dependencies.
 */

const should = require('should');
const program = require('../');

program
  .version('0.0.1')
  .option('-c, --cheese [type]', 'optionally specify the type of cheese');

program.parse(['node', 'test', '--cheese', 'feta']);
program.cheese.should.equal('feta');
