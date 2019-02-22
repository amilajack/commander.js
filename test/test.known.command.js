const sinon = require('sinon');
const should = require('should');
const { default: program } = require('../dist/index.js');

sinon.stub(process, 'exit');
sinon.stub(process.stdout, 'write');

const stubError = sinon.stub(console, 'error');

const cmd = 'my_command';

program.command(cmd, 'description');

program.parse(['node', 'test', cmd]);

stubError.callCount.should.equal(0);
const output = process.stdout.write.args;
output.should.deepEqual([]);

sinon.restore();
