/**
 * Module dependencies.
 */

const should = require('should');
const { default: program } = require('../dist/index.js');

program
  .version('0.0.1')
  .option('-p, --pepper', 'add pepper')
  .option('-c, --no-cheese', 'remove cheese');

program.parse(['node', 'test', '--pepper']);
program.pepper.should.be.true();
program.cheese.should.be.true();
