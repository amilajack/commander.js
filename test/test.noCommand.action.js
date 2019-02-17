const should = require('should');
const program = require('../');

let val = false;
program.option('-C, --no-color', 'turn off color output').action(function() {
  val = this.color;
});

program.parse(['node', 'test']);

program.color.should.equal(val);
