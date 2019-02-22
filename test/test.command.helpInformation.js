const sinon = require('sinon').sandbox.create();
const should = require('should');
const { default: program } = require('../dist/index.js');

program.command('somecommand');
program.command('anothercommand [options]');

const expectedHelpInformation = [
  'Usage:  [options] [command]',
  '',
  'Options:',
  '  -h, --help                output usage information',
  '',
  'Commands:',
  '  somecommand',
  '  anothercommand [options]',
  ''
].join('\n');

program.helpInformation().should.equal(expectedHelpInformation);
