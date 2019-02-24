import Joker from '@amilajack/joker';

const fixture = require.resolve('./fixtures/cmd');

describe('Basic', () => {
  it('should do basic stuff', async () => {
    await new Joker()
      .base('node ')
      .run(`${fixture} --version`)
      .stdout('0.0.1')
      .code(0)
      .run(`${fixture} foo`)
      .stdout('foo')
      .code(0)
      .end();
  });
});
