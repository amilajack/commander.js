import program from '../src';
import sinonCreator from 'sinon';

describe('options', () => {
  let sinon = sinonCreator.createSandbox();

  beforeEach(() => {
    sinon = sinonCreator.createSandbox();
  });

  it('should ', () => {
    program
      .version('0.0.1')
      .option('-c, --cheese [type]', 'optionally specify the type of cheese');

    program.parse(['node', 'test', '--cheese', 'feta']);
    expect(program.cheese).toEqual('feta');
  });

  it('optional', () => {
    program
      .version('0.0.1')
      .option('-c, --cheese [type]', 'optionally specify the type of cheese');

    program.parse(['node', 'test', '--cheese']);
    expect(program.cheese).toBe(true);
  });

  it('required', () => {
    const util = require('util');

    const info = [];

    console.error = function(...args) {
      info.push(util.format.apply(util, args));
    };

    process.on('exit', code => {
      expect(code).toEqual(1);
      expect(info.length).toEqual(1);
      expect(info[0]).toEqual(
        'error: option `-c, --cheese <type>` argument missing'
      );
      process.exit(0);
    });

    program
      .version('0.0.1')
      .option('-c, --cheese <type>', 'optionally specify the type of cheese');

    program.parse(['node', 'test', '--cheese']);
  });

  test('bool', () => {
    program
      .version('0.0.1')
      .option('-p, --pepper', 'add pepper')
      .option('-c, --no-cheese', 'remove cheese');

    program.parse(['node', 'test', '--pepper']);
    expect(program.pepper).toBe(true);
    expect(program.cheese).toBe(true);
  });

  test('bool no', () => {
    program
      .version('0.0.1')
      .option('-p, --pepper', 'add pepper')
      .option('-c|--no-cheese', 'remove cheese');

    program.parse(['node', 'test', '--no-cheese']);
    expect(program.pepper).toEqual(undefined);
    expect(program.cheese).toBe(false);
  });

  test('bool small combined', () => {
    program
      .version('0.0.1')
      .option('-p, --pepper', 'add pepper')
      .option('-c, --no-cheese', 'remove cheese');

    program.parse(['node', 'test', '-pc']);
    expect(program.pepper).toBe(true);
    expect(program.cheese).toBe(false);
  });

  test('bool no small', () => {
    program
      .version('0.0.1')
      .option('-p, --pepper', 'add pepper')
      .option('-c, --no-cheese', 'remove cheese');

    program.parse(['node', 'test', '-p', '-c']);
    expect(program.pepper).toBe(true);
    expect(program.cheese).toBe(false);
  });

  test('cflags', () => {
    program
      .version('0.0.1')
      .option('-c, --cflags <cflags>', 'pass options/flags to a compiler')
      .option('-o, --other', 'just some other option')
      .option('-x, --xother', 'just some other option')
      .option('-y, --yother', 'just some other option')
      .option('-z, --zother', 'just some other option');

    program.parse(['node', 'test', '--cflags', '-DDEBUG', '-o', '-xyz']);
    expect(program).toHaveProperty('cflags', '-DDEBUG');
    expect(program).toHaveProperty('other');
    expect(program).toHaveProperty('xother');
    expect(program).toHaveProperty('yother');
    expect(program).toHaveProperty('zother');
  });

  test('camelcase', () => {
    function parseRange(str) {
      return str.split('..').map(Number);
    }

    program
      .version('0.0.1')
      .option('-i, --my-int <n>', 'pass an int', parseInt)
      .option('-n, --my-num <n>', 'pass a number', Number)
      .option('-f, --my-fLOAT <n>', 'pass a float', parseFloat)
      .option('-m, --my-very-long-float <n>', 'pass a float', parseFloat)
      .option('-u, --my-URL-count <n>', 'pass a float', parseFloat)
      .option('-r, --my-long-range <a..b>', 'pass a range', parseRange);

    program.parse(
      'node test -i 5.5 -f 5.5 -m 6.5 -u 7.5 -n 15.99 -r 1..5'.split(' ')
    );
    expect(program.myInt).toEqual(5);
    expect(program.myNum).toEqual(15.99);
    expect(program.myFLOAT).toEqual(5.5);
    expect(program.myVeryLongFloat).toEqual(6.5);
    expect(program.myURLCount).toEqual(7.5);
    expect(program.myLongRange).toEqual([1, 5]);
  });

  it('should should coerce', () => {
    function parseRange(str) {
      return str.split('..').map(Number);
    }

    function increaseVerbosity(v, total) {
      return total + 1;
    }

    function collectValues(str, memo) {
      memo.push(str);
      return memo;
    }

    program
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
      );

    program.parse(
      'node test -i 5.5 -f 5.5 -n 15.99 -r 1..5 -c foo -c bar -c baz -vvvv --verbose'.split(
        ' '
      )
    );
    expect(program.int).toBe(5);
    expect(program.num).toBe(15.99);
    expect(program.float).toBe(5.5);
    expect(program.range).toBe([1, 5]);
    expect(program.collect).toBe(['foo', 'bar', 'baz']);
    expect(program.verbose).toBe(5);
  });

  it('commands', () => {
    program
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

    program
      .command('setup [env]')
      .description('run setup commands for all envs')
      .option('-s, --setup_mode [mode]', 'Which setup mode to use')
      .option('-o, --host [host]', 'Host to use')
      .action((env, { setup_mode }) => {
        const mode = setup_mode || 'normal';
        env = env || 'all';

        envValue = env;
      });

    program
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

    program.command('*').action(env => {
      console.log('deploying "%s"', env);
    });

    program.parse(['node', 'test', '--config', 'conf']);
    expect(program.config).toEqual('conf');
    expect(program.commands[0]).not.toHaveProperty('setup_mode');
    expect(program.commands[1]).not.toHaveProperty('exec_mode');
    expect(envValue).toEqual('');
    expect(cmdValue).toEqual('');

    program.parse([
      'node',
      'test',
      '--config',
      'conf1',
      'setup',
      '--setup_mode',
      'mode2',
      'env1'
    ]);
    expect(program.config).toEqual('conf1');
    expect(program.commands[0].setup_mode).toEqual('mode2');
    expect(program.commands[0]).not.toHaveProperty('host');
    expect(envValue).toEqual('env1');

    program.parse([
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
    expect(program.config).toEqual('conf2');
    expect(program.commands[0].setup_mode).toEqual('mode3');
    expect(program.commands[0].host).toEqual('host1');
    expect(envValue).toEqual('env2');

    program.parse([
      'node',
      'test',
      '--config',
      'conf3',
      'setup',
      '-s',
      'mode4',
      'env3'
    ]);
    expect(program.config).toEqual('conf3');
    expect(program.commands[0].setup_mode).toEqual('mode4');
    expect(envValue).toEqual('env3');

    program.parse([
      'node',
      'test',
      '--config',
      'conf4',
      'exec',
      '--exec_mode',
      'mode1',
      'exec1'
    ]);
    expect(program.config).toEqual('conf4');
    expect(program.commands[1].exec_mode).toEqual('mode1');
    expect(program.commands[1]).not.toHaveProperty('target');
    expect(cmdValue).toEqual('exec1');

    program.parse([
      'node',
      'test',
      '--config',
      'conf5',
      'exec',
      '-e',
      'mode2',
      'exec2'
    ]);
    expect(program.config).toEqual('conf5');
    expect(program.commands[1].exec_mode).toEqual('mode2');
    expect(cmdValue).toEqual('exec2');

    program.parse([
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
    expect(program.config).toEqual('conf6');
    expect(program.commands[1].exec_mode).toEqual('mode6');
    expect(program.commands[1].target).toEqual('target1');
    expect(cmdValue).toEqual('exec3');

    delete program.commands[1].target;
    program.parse([
      'node',
      'test',
      '--config',
      'conf7',
      'ex',
      '-e',
      'mode3',
      'exec4'
    ]);
    expect(program.config).toEqual('conf7');
    expect(program.commands[1].exec_mode).toEqual('mode3');
    expect(program.commands[1]).not.toHaveProperty('target');
    expect(cmdValue).toEqual('exec4');

    // Make sure we still catch errors with required values for options
    let exceptionOccurred = false;
    const oldProcessExit = process.exit;
    const oldConsoleError = console.error;
    process.exit = () => {
      exceptionOccurred = true;
      throw new Error();
    };
    console.error = () => {};

    const oldProcessStdoutWrite = process.stdout.write;
    process.stdout.write = () => {};
    try {
      program.parse(['node', 'test', '--config', 'conf6', 'exec', '--help']);
    } catch (ex) {
      expect(program.config).toEqual('conf6');
    }
    process.stdout.write = oldProcessStdoutWrite;

    try {
      program.parse([
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

    process.exit = oldProcessExit;
    expect(exceptionOccurred).toBe(true);
    expect(customHelp).toBe(true);
  });

  test('defaults', () => {
    program
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

    expect(program).toHaveProperty('_name', '');

    program.parse(['node', 'test']);
    expect(program).toHaveProperty('_name', 'test');
    expect(program).not.toHaveProperty('anchovies');
    expect(program).not.toHaveProperty('onions');
    expect(program).not.toHaveProperty('olives');
    expect(program).toHaveProperty('sauce', true);
    expect(program).toHaveProperty('crust', 'hand-tossed');
    expect(program).toHaveProperty('cheese', 'mozzarella');
  });

  test('given defaults', () => {
    program
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

    program.parse([
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
    expect(program).toHaveProperty('anchovies', true);
    expect(program).toHaveProperty('onions', true);
    expect(program).toHaveProperty('olives', 'black');
    expect(program).toHaveProperty('sauce', false);
    expect(program).toHaveProperty('crust', 'thin');
    expect(program).toHaveProperty('cheese', 'wensleydale');
  });

  test('equals', () => {
    program
      .version('0.0.1')
      .option('--string <n>', 'pass a string')
      .option('--string2 <n>', 'pass another string')
      .option('--num <n>', 'pass a number', Number);

    program.parse(
      'node test --string=Hello --string2 Hello=World --num=5.5'.split(' ')
    );
    expect(program.string).toEqual('Hello');
    expect(program.string2).toEqual('Hello=World');
    expect(program.num).toEqual(5.5);
  });

  test('func', () => {
    program
      .version('0.0.1')
      .description('some description')
      .option('-f, --foo', 'add some foo')
      .option('-b, --bar', 'add some bar')
      .option('-M, --no-magic', 'disable magic')
      .option('-c, --camel-case', 'convert to camelCase')
      .option('-q, --quux <quux>', 'add some quux');

    program.parse([
      'node',
      'test',
      '--foo',
      '--bar',
      '--no-magic',
      '--camel-case',
      '--quux',
      'value'
    ]);
    expect(program.opts).toBeInstanceOf(Function);

    const opts = program.opts();
    expect(opts).toBeInstanceOf(Object);
    expect(opts.version).toEqual('0.0.1');
    expect(opts.foo).toBe(true);
    expect(opts.bar).toBe(true);
    expect(opts.magic).toBe(false);
    expect(opts.camelCase).toBe(true);
    expect(opts.quux).toEqual('value');
  });

  test('hyphen', () => {
    program
      .version('0.0.1')
      .option('-a, --alpha <a>', 'hyphen')
      .option('-b, --bravo <b>', 'hyphen')
      .option('-c, --charlie <c>', 'hyphen');

    program.parse('node test -a - --bravo - --charlie=- - -- - -t1'.split(' '));
    expect(program.alpha).toEqual('-');
    expect(program.bravo).toEqual('-');
    expect(program.charlie).toEqual('-');
    expect(program.args[0]).toEqual('-');
    expect(program.args[1]).toEqual('-');
    expect(program.args[2]).toEqual('-t1');
  });

  test('large only with value', () => {
    program
      .version('0.0.1')
      .option('--longflag [value]', 'A long only flag with a value');

    program.parse(['node', 'test', '--longflag', 'something']);
    expect(program.longflag).toEqual('something');
  });

  test('large only', () => {
    program.version('0.0.1').option('--verbose', 'do stuff');
    program.parse(['node', 'test', '--verbose']);
    expect(program.verbose).toBe(true);
  });

  test('regex', () => {
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
    expect(program.size).toEqual('medium');
    expect(program.drink).toEqual('coke');
  });

  test('custom version', () => {
    let capturedExitCode;
    let capturedOutput;
    let oldProcessExit;
    let oldProcessStdoutWrite;

    program.version('0.0.1', '-r, --revision').description('description');

    ['-r', '--revision'].forEach(flag => {
      capturedExitCode = -1;
      capturedOutput = '';
      oldProcessExit = process.exit;
      oldProcessStdoutWrite = process.stdout.write;
      process.exit = code => {
        capturedExitCode = code;
      };
      process.stdout.write = output => {
        capturedOutput += output;
      };
      program.parse(['node', 'test', flag]);
      process.exit = oldProcessExit;
      process.stdout.write = oldProcessStdoutWrite;
      expect(capturedOutput).toEqual('0.0.1\n');
      expect(capturedExitCode).toEqual(0);
    });
  });

  test('version', () => {
    let capturedExitCode;
    let capturedOutput;
    let oldProcessExit;
    let oldProcessStdoutWrite;

    program.version('0.0.1').description('description');

    ['-V', '--version'].forEach(flag => {
      capturedExitCode = -1;
      capturedOutput = '';
      oldProcessExit = process.exit;
      oldProcessStdoutWrite = process.stdout.write;
      process.exit = code => {
        capturedExitCode = code;
      };
      process.stdout.write = output => {
        capturedOutput += output;
      };
      program.parse(['node', 'test', flag]);
      process.exit = oldProcessExit;
      process.stdout.write = oldProcessStdoutWrite;
      expect(capturedOutput).toEqual('0.0.1\n');
      expect(capturedExitCode).toEqual(0);
    });
  });

  test('unknown command', () => {
    sinon.stub(process, 'exit');
    sinon.stub(process.stdout, 'write');

    const stubError = sinon.stub(console, 'error');

    const cmd = 'my_command';
    const invalidCmd = 'invalid_command';

    program.command(cmd, 'description');

    program.parse(['node', 'test', invalidCmd]);

    expect(stubError.callCount).toEqual(1);

    sinon.restore();
  });
});
