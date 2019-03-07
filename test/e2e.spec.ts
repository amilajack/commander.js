import Joker from '@amilajack/joker';

const cmdFixture = require.resolve('./fixtures/cmd');
const pmFixture = require.resolve('./fixtures/pm');

describe('E2E', () => {
  it.concurrent('should get version', async () => {
    await new Joker()
      .base(`node ${cmdFixture}`)
      .run('--version')
      .stdout('0.0.1')
      .code(0)
      .run('foo')
      .stdout('foo')
      .code(0)
      .end();
  });

  it.concurrent('should do basic stuff', async () => {
    await new Joker()
      .base(`node ${pmFixture}`)
      .run('--version')
      .stdout('0.0.1')
      .code(0)
      .run('non-existent-command')
      .stdout('default')
      .code(0)
      .end();
  });
});
