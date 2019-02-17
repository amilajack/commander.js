const sinon = require('sinon').sandbox.create();
const should = require('should');
const program = require('../');

program.command('bare');

program.commandHelp().should.equal('Commands:\n  bare\n');

program.command('mycommand [options]');

program
  .commandHelp()
  .should.equal('Commands:\n  bare\n  mycommand [options]\n');
