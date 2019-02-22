const should = require('should');
const { default: program } = require('../dist/index.js');

let val = false;
program
  .version('0.0.1')
  .command('*')
  .description('test')
  .action(function() {
    val = true;
  });

program.parse(['node', 'test']);

val.should.be.false();
