/**
 * Module dependencies.
 */

const should = require('should');
const program = require('../');

program
  .version('0.0.1')
  .option(
    '-s, --size <size>',
    'Pizza Size',
    /^(large|medium|small)$/i,
    'medium'
  )
  .option('-d, --drink [drink]', 'Drink', /^(Coke|Pepsi|Izze)$/i);

program.parse('node test -s big -d coke'.split(' '));
program.size.should.equal('medium');
program.drink.should.equal('coke');
