/**
 * Module dependencies.
 */
const sinon = require('sinon').sandbox.create();
const should = require('should');
const program = require('../');

const stubError = sinon.stub(console, 'error');
const stubExit = sinon.stub(process, 'exit');

program.version('0.0.1').option('-p, --pepper', 'add pepper');
program.parse('node test -m'.split(' '));

stubError.callCount.should.equal(1);

// test subcommand
resetStubStatus();
program.command('sub').action(function() {});
program.parse('node test sub -m'.split(' '));

stubError.callCount.should.equal(2);
stubExit.calledOnce.should.be.true();

// command with `allowUnknownOption`
resetStubStatus();
program.version('0.0.1').option('-p, --pepper', 'add pepper');
program.allowUnknownOption().parse('node test -m'.split(' '));

stubError.callCount.should.equal(0);
stubExit.calledOnce.should.be.false();

// subcommand with `allowUnknownOption`
resetStubStatus();
program
  .command('sub2')
  .allowUnknownOption()
  .action(function() {});
program.parse('node test sub2 -m'.split(' '));

stubError.callCount.should.equal(1);
stubExit.calledOnce.should.be.false();

function resetStubStatus() {
  stubError.reset();
  stubExit.reset();
}
