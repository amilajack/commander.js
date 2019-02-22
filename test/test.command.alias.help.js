const should = require('should');
const { default: program } = require('../dist/index.js');

program
  .command('info [thing]')
  .alias('i')
  .action(function() {});

program
  .command('save [file]')
  .alias('s')
  .action(function() {});

program.parse(['node', 'test']);

program.commandHelp().should.containEql('info|i');
program.commandHelp().should.containEql('save|s');
program.commandHelp().should.not.containEql('test|');
