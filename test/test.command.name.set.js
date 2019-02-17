const sinon = require('sinon').sandbox.create();
const should = require('should');
const program = require('../');

sinon.stub(process, 'exit');
sinon.stub(process.stdout, 'write');

program.name('foobar').description('This is a test.');

program.name.should.be.a.Function();
program.name().should.equal('foobar');
program.description().should.equal('This is a test.');

const output = process.stdout.write.args[0];

sinon.restore();
