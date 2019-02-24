import Joker from '@amilajack/joker';

const cmdFixture = require.resolve('./fixtures/cmd');
const pmFixture = require.resolve('./fixtures/pm');

describe('Basic', () => {
  it('should get version', async () => {
    await new Joker()
      .base('node ')
      .run(`${cmdFixture} --version`)
      .stdout('0.0.1')
      .code(0)
      .run(`${cmdFixture} foo`)
      .stdout('foo')
      .code(0)
      .end();
  });

  it('should do basic stuff', async () => {
    await new Joker()
      .base('node ')
      .run(`${pmFixture} --version`)
      .stdout('0.0.1')
      .code(0)
      .run(`${pmFixture} non-existent-command`)
      .stdout('default')
      .code(0)
      .end();
  });
});
