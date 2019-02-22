const should = require('should');
const { default: program } = require('../dist/index.js');

let val = false;
program.option('-C, --no-color', 'turn off color output').action(function() {
  val = this.color;
});

program.parse(['node', 'test']);

program.color.should.equal(val);
