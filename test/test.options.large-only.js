/**
 * Module dependencies.
 */

const should = require('should');
const { default: program } = require('../dist/index.js');

program.version('0.0.1').option('--verbose', 'do stuff');

program.parse(['node', 'test', '--verbose']);
program.verbose.should.be.true();
