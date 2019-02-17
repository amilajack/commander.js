const sinon = require('sinon');
const should = require('should');
const program = require('../');

sinon.stub(process, 'exit');
sinon.stub(process.stdout, 'write');

const stubError = sinon.stub(console, 'error');

const cmd = 'my_command';
const invalidCmd = 'invalid_command';

program.command(cmd, 'description');

program.parse(['node', 'test', invalidCmd]);

stubError.callCount.should.equal(1);

sinon.restore();
