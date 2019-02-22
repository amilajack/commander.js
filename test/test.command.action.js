const should = require('should');
const { default: program } = require('../dist/index.js');

let val = false;
program
  .command('info [options]')
  .option('-C, --no-color', 'turn off color output')
  .action(function() {
    val = this.color;
  });

program.parse(['node', 'test', 'info']);

program.commands[0].color.should.equal(val);
