const { exec } = require('child_process');
(path = require('path')), (should = require('should'));

const bin = path.join(__dirname, './fixtures/cmd');

exec(`${bin} foo`, function(error, stdout, stderr) {
  stdout.should.equal('foo\n');
});

const unknownSubcmd = 'foo_invalid';
exec(`${bin} ${unknownSubcmd}`, function(error, stdout, stderr) {
  stderr.should.equal(`error: unknown command ${unknownSubcmd}\n`);
});
