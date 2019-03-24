import program from '../src';
import Option from '../src/option';

function parseRange(str: string) {
  return str.split('..').map(Number);
}

describe('basic', () => {
  test('basic', () => {
    const opt1 = new Option('-p, --peppers', 'to include peppers or not');
    expect(opt1.name()).toEqual('peppers');
    expect(opt1.description).toEqual('to include peppers or not');
    expect(opt1.bool).toEqual(true);
    expect(opt1.optional).toEqual(false);
    expect(opt1.required).toEqual(false);
  });

  test('optional', () => {
    const opt1 = new Option(
      '-p, --peppers [type]',
      'to include peppers or not'
    );
    expect(opt1.name()).toEqual('peppers');
    expect(opt1.description).toEqual('to include peppers or not');
    expect(opt1.bool).toEqual(true);
    expect(opt1.optional).toEqual(true);
    expect(opt1.required).toEqual(false);
  });

  test('required', () => {
    const opt1 = new Option(
      '-p, --peppers <type>',
      'to include peppers or not'
    );
    expect(opt1.name()).toEqual('peppers');
    expect(opt1.description).toEqual('to include peppers or not');
    expect(opt1.bool).toEqual(true);
    expect(opt1.optional).toEqual(false);
    expect(opt1.required).toEqual(true);
  });
});

describe('options', () => {
  let mockExit;
  let mockConsoleError;
  let mockConsoleLog;
  let mockProcessErrWrite;
  let mockProcessOutWrite;

  beforeEach(() => {
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    mockConsoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockProcessErrWrite = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation();
    mockProcessOutWrite = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation();
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
    mockProcessErrWrite.mockRestore();
    mockProcessOutWrite.mockRestore();
  });

  it('should ', () => {
    expect(
      program()
        .version('0.0.1')
        .option('-c, --cheese [type]', 'optionally specify the type of cheese')
        .init(['node', 'test', '--cheese', 'feta'])
        .get('cheese')
    ).toEqual('feta');
  });

  test('optional', () => {
    expect(
      program()
        .version('0.0.1')
        .option('-c, --cheese [type]', 'optionally specify the type of cheese')
        .init(['node', 'test', '--cheese'])
        .get('cheese')
    ).toEqual(true);
  });

  test('required', () => {
    program()
      .version('0.0.1')
      .option('-c, --cheese <type>', 'optionally specify the type of cheese')
      .init(['node', 'test', '--cheese']);

    expect(mockConsoleError).toHaveBeenCalledWith(
      'error: option `%s` argument missing',
      '-c, --cheese <type>'
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test('bool', () => {
    const prog = program()
      .version('0.0.1')
      .option('-p, --pepper', 'add pepper')
      .option('-c, --no-cheese', 'remove cheese')
      .init(['node', 'test', '--pepper']);
    expect(prog.get('pepper')).toEqual(true);
    expect(prog.get('cheese')).toEqual(true);
  });

  test('bool no', () => {
    const prog = program()
      .version('0.0.1')
      .option('-p, --pepper', 'add pepper')
      .option('-c|--no-cheese', 'remove cheese')
      .init(['node', 'test', '--no-cheese']);
    expect(() => prog.get('pepper')).toThrow('Option "pepper" does not exist');
    expect(prog.get('cheese')).toEqual(false);
  });

  test('bool small combined', () => {
    const prog = program()
      .version('0.0.1')
      .option('-p, --pepper', 'add pepper')
      .option('-c, --no-cheese', 'remove cheese')
      .init(['node', 'test', '-pc']);
    expect(prog.get('pepper')).toEqual(true);
    expect(prog.get('cheese')).toEqual(false);
  });

  test('bool no small', () => {
    const prog = program()
      .version('0.0.1')
      .option('-p, --pepper', 'add pepper')
      .option('-c, --no-cheese', 'remove cheese')
      .init(['node', 'test', '-p', '-c']);
    expect(prog.get('pepper')).toEqual(true);
    expect(prog.get('cheese')).toEqual(false);
  });

  test('cflags', () => {
    const prog = program()
      .version('0.0.1')
      .option('-c, --cflags <cflags>', 'pass options/flags to a compiler')
      .option('-o, --other', 'just some other option')
      .option('-x, --xother', 'just some other option')
      .option('-y, --yother', 'just some other option')
      .option('-z, --zother', 'just some other option')

      .init(['node', 'test', '--cflags', '-DDEBUG', '-o', '-xyz']);
    expect(prog).toHaveProperty('cflags', '-DDEBUG');
    expect(prog).toHaveProperty('other');
    expect(prog).toHaveProperty('xother');
    expect(prog).toHaveProperty('yother');
    expect(prog).toHaveProperty('zother');
  });

  test('camelcase', () => {
    const prog = program()
      .version('0.0.1')
      .option('-i, --my-int <n>', 'pass an int', parseInt)
      .option('-n, --my-num <n>', 'pass a number', Number)
      .option('-f, --my-fLOAT <n>', 'pass a float', parseFloat)
      .option('-m, --my-very-long-float <n>', 'pass a float', parseFloat)
      .option('-u, --my-URL-count <n>', 'pass a float', parseFloat)
      .option('-r, --my-long-range <a..b>', 'pass a range', parseRange)

      .init(
        'node test -i 5.5 -f 5.5 -m 6.5 -u 7.5 -n 15.99 -r 1..5'.split(' ')
      );
    expect(prog.get('myInt')).toEqual(5);
    expect(prog.get('myNum')).toEqual(15.99);
    expect(prog.get('myFLOAT')).toEqual(5.5);
    expect(prog.get('myVeryLongFloat')).toEqual(6.5);
    expect(prog.get('myURLCount')).toEqual(7.5);
    expect(prog.get('myLongRange')).toEqual([1, 5]);
  });

  it('should coerce', () => {
    function increaseVerbosity(v: string, total: number) {
      return total + 1;
    }

    function collectValues(str: string, memo: string[]) {
      memo.push(str);
      return memo;
    }

    const prog = program()
      .version('0.0.1')
      .option('-i, --int <n>', 'pass an int', parseInt)
      .option('-n, --num <n>', 'pass a number', Number)
      .option('-f, --float <n>', 'pass a float', parseFloat)
      .option('-r, --range <a..b>', 'pass a range', parseRange)
      .option('-v, --verbose', 'increase verbosity', increaseVerbosity, 0)
      .option(
        '-c, --collect <str>',
        'add a string (can be used multiple times)',
        collectValues,
        []
      )
      .init(
        'node test -i 5.5 -f 5.5 -n 15.99 -r 1..5 -c foo -c bar -c baz -vvvv --verbose'.split(
          ' '
        )
      );
    expect(prog.get('int')).toEqual(5);
    expect(prog.get('num')).toEqual(15.99);
    expect(prog.get('float')).toEqual(5.5);
    expect(prog.get('range')).toEqual([1, 5]);
    expect(prog.get('collect')).toEqual(['foo', 'bar', 'baz']);
    expect(prog.get('verbose')).toEqual(true);
  });

  it('commands', () => {
    let prog = program()
      .version('0.0.1')
      .option('-C, --chdir <path>', 'change the working directory')
      .option(
        '-c, --config <path>',
        'set config path. defaults to ./deploy.conf'
      )
      .option('-T, --no-tests', 'ignore test hook');

    let envValue = '';
    let cmdValue = '';
    let customHelp = false;

    prog
      .command('setup [env]')
      .description('run setup commands for all envs')
      .option('-s, --setup_mode [mode]', 'Which setup mode to use')
      .option('-o, --host [host]', 'Host to use')
      .action(
        (env: string, { setup_mode: setupMode }: { setup_mode: string }) => {
          env = env || 'all';
          envValue = env;
        }
      );

    prog
      .command('exec <cmd>')
      .alias('ex')
      .description('execute the given remote cmd')
      .option('-e, --exec_mode <mode>', 'Which exec mode to use')
      .option('-t, --target [target]', 'Target to use')
      .action((cmd, options) => {
        cmdValue = cmd;
      })
      .on('--help', () => {
        customHelp = true;
      });

    prog = prog
      .command('*')
      .action(env => {
        console.log('deploying "%s"', env);
      })
      .init(['node', 'test', '--config', 'conf']);

    expect(prog.get('config')).toEqual('conf');
    expect(prog.commands[0]).not.toHaveProperty('setup_mode');
    expect(prog.commands[1]).not.toHaveProperty('exec_mode');
    expect(envValue).toEqual('');
    expect(cmdValue).toEqual('');

    prog = prog.init([
      'node',
      'test',
      '--config',
      'conf1',
      'setup',
      '--setup_mode',
      'mode2',
      'env1'
    ]);
    expect(prog.get('config')).toEqual('conf1');
    expect(prog.commands[0].get('setup_mode')).toEqual('mode2');
    expect(prog.commands[0]).not.toHaveProperty('host');
    expect(envValue).toEqual('env1');

    prog = prog.init([
      'node',
      'test',
      '--config',
      'conf2',
      'setup',
      '--setup_mode',
      'mode3',
      '-o',
      'host1',
      'env2'
    ]);
    expect(prog.get('config')).toEqual('conf2');
    expect(prog.commands[0].get('setup_mode')).toEqual('mode3');
    expect(prog.commands[0].get('host')).toEqual('host1');
    expect(envValue).toEqual('env2');

    prog = prog.init([
      'node',
      'test',
      '--config',
      'conf3',
      'setup',
      '-s',
      'mode4',
      'env3'
    ]);
    expect(prog.get('config')).toEqual('conf3');
    expect(prog.commands[0].get('setup_mode')).toEqual('mode4');
    expect(envValue).toEqual('env3');

    prog = prog.init([
      'node',
      'test',
      '--config',
      'conf4',
      'exec',
      '--exec_mode',
      'mode1',
      'exec1'
    ]);
    expect(prog.get('config')).toEqual('conf4');
    expect(prog.commands[1].get('exec_mode')).toEqual('mode1');
    expect(prog.commands[1]).not.toHaveProperty('target');
    expect(cmdValue).toEqual('exec1');

    prog = prog.init([
      'node',
      'test',
      '--config',
      'conf5',
      'exec',
      '-e',
      'mode2',
      'exec2'
    ]);
    expect(prog.get('config')).toEqual('conf5');
    expect(prog.commands[1].get('exec_mode')).toEqual('mode2');
    expect(cmdValue).toEqual('exec2');

    prog = prog.init([
      'node',
      'test',
      '--config',
      'conf6',
      'exec',
      '--target',
      'target1',
      '-e',
      'mode6',
      'exec3'
    ]);
    expect(prog.get('config')).toEqual('conf6');
    expect(prog.commands[1].get('exec_mode')).toEqual('mode6');
    expect(prog.commands[1].get('target')).toEqual('target1');
    expect(cmdValue).toEqual('exec3');

    // @ts-ignore
    delete prog.commands[1].target;
    prog = prog.init([
      'node',
      'test',
      '--config',
      'conf7',
      'ex',
      '-e',
      'mode3',
      'exec4'
    ]);
    expect(prog.get('config')).toEqual('conf7');
    expect(prog.commands[1].get('exec_mode')).toEqual('mode3');
    expect(prog.commands[1]).not.toHaveProperty('target');
    expect(cmdValue).toEqual('exec4');

    try {
      prog.init(['node', 'test', '--config', 'conf6', 'exec', '--help']);
    } catch (ex) {
      expect(prog.get('config')).toEqual('conf6');
    }

    try {
      prog.init([
        'node',
        'test',
        '--config',
        'conf',
        'exec',
        '-t',
        'target1',
        'exec1',
        '-e'
      ]);
    } catch (ex) {}

    expect(mockExit).toHaveBeenCalled();
    expect(customHelp).toEqual(true);
  });

  test('defaults', () => {
    let prog = program()
      .version('0.0.1')
      .option('-a, --anchovies', 'Add anchovies?')
      .option('-o, --onions', 'Add onions?', true)
      .option('-v, --olives', 'Add olives? Sorry we only have black.', 'black')
      .option('-s, --no-sauce', 'Uh… okay')
      .option(
        '-r, --crust <type>',
        'What kind of crust would you like?',
        'hand-tossed'
      )
      .option(
        '-c, --cheese [type]',
        'optionally specify the type of cheese',
        'mozzarella'
      );

    expect(prog).toHaveProperty('_name', '');

    prog = prog.init(['node', 'test']);
    expect(prog).toHaveProperty('_name', 'test');
    expect(prog).not.toHaveProperty('anchovies');
    expect(prog).not.toHaveProperty('onions');
    expect(prog).not.toHaveProperty('olives');
    expect(prog).toHaveProperty('sauce', true);
    expect(prog).toHaveProperty('crust', 'hand-tossed');
    expect(prog).toHaveProperty('cheese', 'mozzarella');
  });

  test('given defaults', () => {
    const prog = program()
      .version('0.0.1')
      .option('-a, --anchovies', 'Add anchovies?')
      .option('-o, --onions', 'Add onions?', true)
      .option('-v, --olives', 'Add olives? Sorry we only have black.', 'black')
      .option('-s, --no-sauce', 'Uh… okay')
      .option(
        '-r, --crust <type>',
        'What kind of crust would you like?',
        'hand-tossed'
      )
      .option(
        '-c, --cheese [type]',
        'optionally specify the type of cheese',
        'mozzarella'
      )
      .init([
        'node',
        'test',
        '--anchovies',
        '--onions',
        '--olives',
        '--no-sauce',
        '--crust',
        'thin',
        '--cheese',
        'wensleydale'
      ]);
    expect(prog).toHaveProperty('anchovies', true);
    expect(prog).toHaveProperty('onions', true);
    expect(prog).toHaveProperty('olives', 'black');
    expect(prog).toHaveProperty('sauce', false);
    expect(prog).toHaveProperty('crust', 'thin');
    expect(prog).toHaveProperty('cheese', 'wensleydale');
  });

  test('equals', () => {
    const prog = program()
      .version('0.0.1')
      .option('--string <n>', 'pass a string')
      .option('--string2 <n>', 'pass another string')
      .option('--num <n>', 'pass a number', Number)
      .init(
        'node test --string=Hello --string2 Hello=World --num=5.5'.split(' ')
      );
    expect(prog.get('string')).toEqual('Hello');
    expect(prog.get('string2')).toEqual('Hello=World');
    expect(prog.get('num')).toEqual(5.5);
  });

  test('func', () => {
    const prog = program()
      .version('0.0.1')
      .description('some description')
      .option('-f, --foo', 'add some foo')
      .option('-b, --bar', 'add some bar')
      .option('-M, --no-magic', 'disable magic')
      .option('-c, --camel-case', 'convert to camelCase')
      .option('-q, --quux <quux>', 'add some quux')
      .init([
        'node',
        'test',
        '--foo',
        '--bar',
        '--no-magic',
        '--camel-case',
        '--quux',
        'value'
      ]);
    expect(prog.opts).toBeInstanceOf(Function);

    const opts = prog.opts();
    expect(opts).toBeInstanceOf(Object);
    expect(opts.version).toEqual('0.0.1');
    expect(opts.foo).toEqual(true);
    expect(opts.bar).toEqual(true);
    expect(opts.magic).toEqual(false);
    expect(opts.camelCase).toEqual(true);
    expect(opts.quux).toEqual('value');
  });

  test('hyphen', () => {
    const prog = program()
      .version('0.0.1')
      .option('-a, --alpha <a>', 'hyphen')
      .option('-b, --bravo <b>', 'hyphen')
      .option('-c, --charlie <c>', 'hyphen')
      .init('node test -a - --bravo - --charlie=- - -- - -t1'.split(' '));

    expect(prog.get('alpha')).toEqual('-');
    expect(prog.get('bravo')).toEqual('-');
    expect(prog.get('charlie')).toEqual('-');
    expect(prog.get('args')[0]).toEqual('-');
    expect(prog.get('args')[1]).toEqual('-');
    expect(prog.get('args')[2]).toEqual('-t1');
  });

  test('large only with value', () => {
    const prog = program()
      .version('0.0.1')
      .option('--longflag [value]', 'A long only flag with a value')
      .init(['node', 'test', '--longflag', 'something']);
    expect(prog.get('longflag')).toEqual('something');
  });

  test('large only', () => {
    const prog = program()
      .version('0.0.1')
      .option('--verbose', 'do stuff')
      .init(['node', 'test', '--verbose']);
    expect(prog.get('verbose')).toEqual(true);
  });

  test('regex', () => {
    const prog = program()
      .version('0.0.1')
      .option(
        '-s, --size <size>',
        'Pizza Size',
        /^(large|medium|small)$/i,
        'medium'
      )
      .option('-d, --drink [drink]', 'Drink', /^(Coke|Pepsi|Izze)$/i)
      .init('node test -s big -d coke'.split(' '));
    expect(prog.get('size')).toEqual('medium');
    expect(prog.get('drink')).toEqual('coke');
  });

  /**
   * @TODO Mock process exit and stdout
   */
  test.skip('custom version', () => {
    let capturedExitCode;
    let capturedOutput;
    let oldProcessExit;

    let prog = program()
      .version('0.0.1', '-r, --revision')
      .description('description');

    ['-r', '--revision'].forEach(flag => {
      prog.init(['node', 'test', flag]);
      process.exit = oldProcessExit;
      expect(capturedOutput).toEqual('0.0.1\n');
      expect(capturedExitCode).toEqual(0);
    });
  });

  /**
   * @TODO Mock process exit and stdout
   */
  test.skip('version', () => {
    let capturedExitCode;
    let capturedOutput;

    let prog = program()
      .version('0.0.1')
      .description('description');

    ['-V', '--version'].forEach(flag => {
      prog.init(['node', 'test', flag]);
      expect(capturedOutput).toEqual('0.0.1\n');
      expect(capturedExitCode).toEqual(0);
    });
  });

  test('unknown command', () => {
    const cmd = 'my_command';
    const invalidCmd = 'invalid_command';

    program()
      .name('test')
      .command(cmd, 'description')
      .init(['node', 'test', invalidCmd]);

    expect(mockConsoleError).toHaveBeenCalledWith("error: unknown command %s", 'invalid_command');
  });
});
