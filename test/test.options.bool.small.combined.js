/**
 * Module dependencies.
 */

const should = require('should');
const program = require('../');

program
  .version('0.0.1')
  .option('-p, --pepper', 'add pepper')
  .option('-c, --no-cheese', 'remove cheese');

program.parse(['node', 'test', '-pc']);
program.pepper.should.be.true();
program.cheese.should.be.false();
