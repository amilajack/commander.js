/**
 * Module dependencies.
 */

const should = require('should');
const util = require('util');
const { default: program } = require('../dist/index.js');

const programArgs = [
  'node',
  'test',
  'mycommand',
  'arg0',
  'arg1',
  'arg2',
  'arg3'
];
let requiredArg;
let variadicArg;

program
  .version('0.0.1')
  .command('mycommand <id> [variadicArg...]')
  .action(function(arg0, arg1) {
    requiredArg = arg0;
    variadicArg = arg1;
  });

program.parse(programArgs);

requiredArg.should.eql('arg0');
variadicArg.should.eql(['arg1', 'arg2', 'arg3']);

program.args.should.have.lengthOf(3);
program.args[0].should.eql('arg0');
program.args[1].should.eql(['arg1', 'arg2', 'arg3']);

program
  .version('0.0.1')
  .command('mycommand <variadicArg...> [optionalArg]')
  .action(function() {});

// Make sure we still catch errors with required values for options
const consoleErrors = [];
const oldProcessExit = process.exit;
const oldConsoleError = console.error;
let errorMessage;

process.exit = function() {
  throw new Error(consoleErrors.join('\n'));
};
console.error = function() {
  consoleErrors.push(util.format.apply(util, arguments));
};

try {
  program.parse(programArgs);

  should.fail(null, null, 'An Error should had been thrown above');
} catch (err) {
  errorMessage = err.message;
}

process.exit = oldProcessExit;
console.error = oldConsoleError;

'error: variadic arguments must be last `variadicArg`'.should.eql(errorMessage);
