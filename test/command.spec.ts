import path from 'path';
import { spawn, exec } from 'child_process';
import Joker from '@amilajack/joker';
import program from '../src';
// import mockProcess from 'jest-mock-process';

process.env.DARK_ENV = 'test';

const sinon = {};

jest.setTimeout(10000);

describe('command', () => {
  beforeEach(() => {
    // jest.spyOn(process, 'exit').mockImplementation(() => {});
    // jest.spyOn(console, 'error').mockImplementation(() => {});
    // jest.spyOn(console, 'log').mockImplementation(() => {});
    // jest.spyOn(process.stderr, 'write').mockImplementation();
    // jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  test('commands', () => {
    let val;
    const prog = program()
      .name('test')
      .command('mycommand')
      .option('-c, --cheese [type]', 'optionally specify the type of cheese')
      .action(({ cheese }) => {
        val = cheese;
      })
      .parse(['node', 'test', 'mycommand', '--cheese', '']);

    expect(prog).toHaveProperty('commands', expect.any(Object));
    expect(val).toEqual('');
  });

  test('empty action', () => {
    let val = 'some cheese';
    const prog = program()
      .name('test')
      .command('mycommand')
      .option('-c, --cheese [type]', 'optionally specify the type of cheese')
      .action(({ cheese }) => {
        val = cheese;
      })
      .parse(['node', 'test', 'mycommand', '--cheese', '']);

    expect(prog.get('cheese')).toEqual('');
    expect(val).toEqual('');
  });

  test('command action', () => {
    let val = false;
    const prog = program()
      .command('info [options]')
      .option('-C, --no-color', 'turn off color output')
      .action(function() {
        val = this.color;
      })
      .parse(['node', 'test', 'info']);

    expect(prog.commands).toHaveLength(1);
    expect(prog.commands[0].color).toEqual(val);
  });

  test('command alias help', () => {
    const prog = program()
      .command('info [thing]')
      .alias('i')
      .action(() => {})
      .command('save [file]')
      .alias('s')
      .action(() => {})
      .parse(['node', 'test']);

    expect(prog.commandHelp()).toContain('info|i');
    expect(prog.commandHelp()).toContain('save|s');
    expect(prog.commandHelp()).not.toContain('test|');
  });

  /**
   * Failing because of incorrect stubs
   */
  test.skip('command allowUnknownOption', () => {
    const stubError = sinon.stub(console, 'error');
    const stubExit = sinon.stub(process, 'exit');

    let prog = program()
      .version('0.0.1')
      .option('-p, --pepper', 'add pepper')
      .parse('node test -m'.split(' '));

    expect(stubError.callCount).toEqual(1);

    function resetStubStatus() {
      stubError.reset();
      stubExit.reset();
    }

    // test subcommand
    resetStubStatus();
    prog = prog
      .command('sub')
      .action(() => {})
      .parse('node test sub -m'.split(' '));

    expect(stubError.callCount).toEqual(2);
    expect(stubExit.calledOnce).toBe(true);

    // command with `allowUnknownOption`
    resetStubStatus();
    prog = prog
      .version('0.0.1')
      .option('-p, --pepper', 'add pepper')
      .allowUnknownOption()
      .parse('node test -m'.split(' '));

    expect(stubError.callCount).toEqual(0);
    expect(stubExit.calledOnce).toBe(false);

    // subcommand with `allowUnknownOption`
    resetStubStatus();
    program()
      .command('sub2')
      .allowUnknownOption()
      .action(() => {})
      .parse('node test sub2 -m'.split(' '));

    expect(stubError.callCount).toEqual(1);
    expect(stubExit.calledOnce).toBe(false);
  });

  test('autocompletion single', () => {
    expect(program().hasCompletionRules()).toBe(false);

    let prog = program()
      .arguments('<filename>')
      .option('--verbose', 'verbose')
      .option('-o, --output <file>', 'output')
      .option('--debug-level <level>', 'debug level')
      .option('-m <mode>', 'mode')
      .complete({
        options: {
          '--output': function() {
            return ['file1', 'file2'];
          },
          '--debug-level': ['info', 'error'],
          '-m': function(typedArgs) {
            return typedArgs;
          }
        },
        arguments: {
          filename: ['file1.c', 'file2.c']
        }
      });

    expect(prog.hasCompletionRules()).toBe(true);

    prog.autocompleteNormalizeRules();

    expect(prog).toEqual({
      options: {
        '--verbose': {
          arity: 0,
          sibling: null,
          reply: []
        },
        '-o': {
          arity: 1,
          sibling: '--output',
          reply: prog._completionRules.options['--output']
        },
        '--output': {
          arity: 1,
          sibling: '-o',
          reply: prog._completionRules.options['--output']
        },
        '--debug-level': {
          arity: 1,
          sibling: null,
          reply: ['info', 'error']
        },
        '-m': {
          arity: 1,
          sibling: null,
          reply: prog._completionRules.options['-m']
        }
      },
      args: [['file1.c', 'file2.c']]
    });

    expect(prog.autocompleteCandidates([])).toEqual([
      '--verbose',
      '-o',
      '--output',
      '--debug-level',
      '-m',
      'file1.c',
      'file2.c'
    ]);

    expect(prog.autocompleteCandidates(['--verbose'])).toEqual([
      '-o',
      '--output',
      '--debug-level',
      '-m',
      'file1.c',
      'file2.c'
    ]);

    expect(prog.autocompleteCandidates(['-o'])).toEqual(['file1', 'file2']);

    expect(prog.autocompleteCandidates(['--output'])).toEqual([
      'file1',
      'file2'
    ]);

    expect(prog.autocompleteCandidates(['--debug-level'])).toEqual([
      'info',
      'error'
    ]);

    expect(prog.autocompleteCandidates(['-m'])).toEqual(['-m']);

    expect(prog.autocompleteCandidates(['--verbose', '-m'])).toEqual([
      '--verbose',
      '-m'
    ]);

    expect(
      prog.autocompleteCandidates([
        '--verbose',
        '-o',
        'file1',
        '--debug-level',
        'info',
        '-m',
        'production'
      ])
    ).toEqual(['file1.c', 'file2.c']);

    // nothing to complete
    expect(
      prog.autocompleteCandidates([
        '--verbose',
        '-o',
        'file1',
        '--debug-level',
        'info',
        '-m',
        'production',
        'file1.c'
      ])
    ).toEqual([]);

    // place arguments in different position
    expect(
      prog.autocompleteCandidates([
        'file1.c',
        '-o',
        'file1',
        '--debug-level',
        'info',
        '-m',
        'production'
      ])
    ).toEqual(['--verbose']);

    // should handle the case
    // when provide more args than expected
    expect(
      prog.autocompleteCandidates([
        'file1.c',
        'file2.c',
        '--verbose',
        '-o',
        'file1',
        '--debug-level',
        'info',
        '-m',
        'production'
      ])
    ).toEqual([]);
  });

  test.skip('autocompletion subcommand', () => {
    let prog = program()
      .command('clone <url>')
      .option('--debug-level <level>', 'debug level')
      .complete({
        options: {
          '--debug-level': ['info', 'error']
        },
        arguments: {
          url: ['https://github.com/1', 'https://github.com/2']
        }
      });

    prog
      .command('add <file1> <file2>')
      .option('-A', 'add all files')
      .option('--debug-level <level>', 'debug level')
      .complete({
        options: {
          '--debug-level': ['info', 'error']
        },
        arguments: {
          file1: ['file1.c', 'file11.c'],
          file2: ['file2.c', 'file21.c']
        }
      });

    expect(prog.hasCompletionRules()).toBe(true);

    const rootReply = sinon.spy();

    prog.autocompleteHandleEvent({
      reply: rootReply,
      fragment: 1,
      line: 'git'
    });

    expect(rootReply.calledOnce).toBe(true);
    expect(rootReply.getCall(0).args[0]).toEqual(['clone', 'add', '--help']);

    const cloneReply = sinon.spy();

    prog.autocompleteHandleEvent({
      reply: cloneReply,
      fragment: 2,
      line: 'git clone'
    });

    expect(cloneReply.calledOnce).toBe(true);
    cloneReply.getCall(0);
    expect(program().args[0]).toEqual([
      '--debug-level',
      'https://github.com/1',
      'https://github.com/2'
    ]);

    const cloneWithOptionReply = sinon.spy();

    prog.autocompleteHandleEvent({
      reply: cloneWithOptionReply,
      fragment: 3,
      line: 'git clone --debug-level'
    });

    expect(cloneWithOptionReply.calledOnce).toBe(true);
    expect(cloneWithOptionReply.getCall(0).args[0]).toEqual(['info', 'error']);

    const addReply = sinon.spy();

    prog.autocompleteHandleEvent({
      reply: addReply,
      fragment: 2,
      line: 'git add'
    });

    expect(addReply.calledOnce).toBe(true);
    addReply.getCall(0);
    expect(prog.args[0]).toEqual([
      '-A',
      '--debug-level',
      'file1.c',
      'file11.c'
    ]);

    const addWithArgReply = sinon.spy();

    prog.autocompleteHandleEvent({
      reply: addWithArgReply,
      fragment: 3,
      line: 'git add file1.c'
    });

    expect(addWithArgReply.calledOnce).toBe(true);
    addWithArgReply.getCall(0);
    expect(prog.args[0]).toEqual([
      '-A',
      '--debug-level',
      'file2.c',
      'file21.c'
    ]);
  });

  test.concurrent('executableSubcommand', async () => {
    const bin = path.join(__dirname, 'fixtures/pm');
    await new Joker()
      .base(bin)
      .run('list')
      .stdout('')
      .stderr('\n  pm-list(1) does not exist, try --help\n\n')
      .run('install')
      .stdout('install')
      .run('publish')
      .stdout('publish')
      .end();
  });

  test('executable subcommand signals hup', done => {
    const bin = path.join(__dirname, 'fixtures/pm');
    const proc = spawn(bin, ['listen'], {});

    let output = '';
    proc.stdout.on('data', data => {
      output += data.toString();
    });

    // Set a timeout to give 'proc' time to setup completely
    setTimeout(() => {
      proc.kill('SIGHUP');

      // Set another timeout to give 'prog' time to handle the signal
      setTimeout(() => {
        expect(output).toEqual('SIGHUP\n');
        done();
      }, 1000);
    }, 2000);
  });

  test('executable subcommand signals int', done => {
    const bin = path.join(__dirname, 'fixtures/pm');
    const proc = spawn(bin, ['listen'], {});

    let output = '';
    proc.stdout.on('data', data => {
      output += data.toString();
    });

    // Set a timeout to give 'proc' time to setup completely
    setTimeout(() => {
      proc.kill('SIGINT');

      // Set another timeout to give 'prog' time to handle the signal
      setTimeout(() => {
        expect(output).toEqual('SIGINT\n');
        done();
      }, 1000);
    }, 2000);
  });

  test('term', done => {
    const bin = path.join(__dirname, 'fixtures/pm');
    const proc = spawn(bin, ['listen'], {});

    let output = '';
    proc.stdout.on('data', data => {
      output += data.toString();
    });

    // Set a timeout to give 'proc' time to setup completely
    setTimeout(() => {
      proc.kill('SIGTERM');

      // Set another timeout to give 'prog' time to handle the signal
      setTimeout(() => {
        expect(output).toEqual('SIGTERM\n');
        done();
      }, 1000);
    }, 2000);
  });

  test('usr1', done => {
    const bin = path.join(__dirname, 'fixtures/pm');
    const proc = spawn(bin, ['listen'], {});

    let output = '';
    proc.stdout.on('data', data => {
      output += data.toString();
    });

    // Set a timeout to give 'proc' time to setup completely
    setTimeout(() => {
      proc.kill('SIGUSR1');

      // Set another timeout to give 'prog' time to handle the signal
      setTimeout(() => {
        /*
         * As described at https://nodejs.org/api/process.html#process_signal_events
         * this signal will start a debugger and thus the process might output an
         * additional error message:
         *
         *    "Failed to open socket on port 5858, waiting 1000 ms before retrying".
         *
         * Therefore, we are a bit more lax in matching the output.
         * It must contain the expected output, meaning an empty line containing
         * only "SIGUSR1", but any other output is also allowed.
         */
        expect(output).toMatch(/(^|\n)SIGUSR1\n/);
        done();
      }, 1000);
    }, 2000);
  });

  test('usr2', done => {
    const bin = path.join(__dirname, 'fixtures/pm');
    const proc = spawn(bin, ['listen'], {});

    let output = '';
    proc.stdout.on('data', data => {
      output += data.toString();
    });

    // Set a timeout to give 'proc' time to setup completely
    setTimeout(() => {
      proc.kill('SIGUSR2');

      // Set another timeout to give 'prog' time to handle the signal
      setTimeout(() => {
        expect(output).toEqual('SIGUSR2\n');
        done();
      }, 1000);
    }, 2000);
  });

  test('tsnode', done => {
    const bin = path.join(__dirname, 'fixtures-ts/pm.ts');
    exec(
      `${process.argv[0]} -r ts-node/register ${bin} install`,
      (error, stdout, stderr) => {
        expect(stdout).toEqual('install\n');
        done();
      }
    );
  });

  test.concurrent('executableSubcommandAlias help', async () => {
    const bin = path.join(__dirname, 'fixtures/pm');
    await new Joker()
      .base(bin)
      .run('help')
      .expect(({ stdout, stderr }) => {
        expect(stdout).toContain('install|i');
        expect(stdout).toContain('search|s');
        expect(stdout).toContain('cache|c');
        expect(stdout).toContain('list');
        expect(stdout).toContain('publish|p');
        expect(stdout).not.toContain('pm|');
        expect(stderr).toEqual('');
      })
      .end();
  });

  test.concurrent('executableSubcommandAlias alias', async () => {
    await new Joker()
      .base(path.join(__dirname, 'fixtures/pm'))
      .run('i')
      .stdout('install')
      .run('p')
      .stdout('p')
      .run('s')
      .stdout('install')
      .base(path.join(__dirname, 'fixtures/pmlink'))
      .run('i')
      .stdout('install')
      .end();
  });

  test.concurrent('executableSubcommandDefault', async () => {
    await new Joker()
      .base(path.join(__dirname, 'fixtures/pm'))
      .run('default')
      .stdout('default')
      .run('')
      .stdout('default')
      .run('list')
      .stderr('\n  pm-list(1) does not exist, try --help\n\n')
      .base(path.join(__dirname, 'fixtures/pmlink'))
      .run('install')
      .stdout('install')
      .end();
    // success case
    // exec(`${bin} default`, (error, stdout, stderr) => {
    //   expect(stdout).toEqual('default\n');
    // });

    // // success case (default)
    // exec(bin, (error, stdout, stderr) => {
    //   expect(stdout).toEqual('default\n');
    // });

    // // not exist
    // exec(`${bin} list`, (error, stdout, stderr) => {
    //   expect(stderr).toEqual('\n  pm-list(1) does not exist, try --help\n\n');
    //   // TODO error info are not the same in between <=v0.8 and later version
    //   expect(0).not.toEqual(stderr.length);
    // });

    // // success case
    // exec(`${bin} install`, (error, stdout, stderr) => {
    //   expect(stdout).toEqual('install\n');
    // });

    // // subcommand bin file with explicit extension
    // exec(`${bin} publish`, (error, stdout, stderr) => {
    //   expect(stdout).toEqual('publish\n');
    // });

    // // spawn EACCES
    // exec(`${bin} search`, (error, stdout, { length }) => {
    //   // TODO error info are not the same in between <v0.10 and v0.12
    //   expect(0).not.toEqual(length);
    // });

    // // when `bin` is a symbol link for mocking global install
    // bin = path.join(__dirname, 'fixtures/pmlink');
    // // success case
    // exec(`${bin} install`, (error, stdout, stderr) => {
    //   expect(stdout).toEqual('install\n');
    // });
  });

  test.concurrent('executableSubcommandSubcommand', async () => {
    await new Joker()
      .base(path.join(__dirname, 'fixtures/pm'))
      .run('cache help')
      .expect(({ stdout, stderr }) => {
        expect(stdout).toContain('Usage:');
        expect(stdout).toContain('cache');
        expect(stdout).toContain('validate');
        expect(stderr).toEqual('');
      })
      .run('cache clear')
      .expect(({ stdout, stderr }) => {
        expect(stdout).toEqual('cache-clear\n');
        expect(stderr).toEqual('');
      })
      .run('cache nope')
      .expect(({ stdout, stderr }) => {
        expect(stdout).toEqual('cache-validate');
        expect(stderr).toEqual('');
      })
      .end();
  });

  test('executableSubcommandUnknown', done => {
    const bin = path.join(__dirname, 'fixtures/cmd');

    exec(`${bin} foo`, (error, stdout, stderr) => {
      expect(stdout).toEqual('foo\n');
    });

    const unknownSubcmd = 'foo_invalid';
    exec(`${bin} ${unknownSubcmd}`, (error, stdout, stderr) => {
      expect(stderr).toEqual(`error: unknown command ${unknownSubcmd}\n`);
      done();
    });
  });

  test('failOnSameAlias', done => {
    const bin = path.join(__dirname, 'fixtures/cmd');

    exec(`${bin} foo`, (error, stdout, stderr) => {
      expect(stdout).toEqual('foo\n');
    });

    const unknownSubcmd = 'foo_invalid';
    exec(`${bin} ${unknownSubcmd}`, (error, stdout, stderr) => {
      expect(stderr).toEqual(`error: unknown command ${unknownSubcmd}\n`);
      done();
    });
  });

  test('help', () => {
    let prog = program().command('bare');

    expect(prog.commandHelp()).toEqual('Commands:\n  bare\n');

    prog.command('mycommand [options]');

    expect(prog.commandHelp()).toEqual(
      'Commands:\n  bare\n  mycommand [options]\n'
    );
  });

  test('helpInformation', () => {
    const prog = program()
      .command('somecommand')
      .command('anothercommand [options]');
    expect(prog.commands).toHaveLength(2);

    const expectedHelpInformation = [
      'Usage:  [options] [command]',
      '',
      'Options:',
      '  -h, --help                output usage information',
      '',
      'Commands:',
      '  somecommand',
      '  anothercommand [options]',
      ''
    ].join('\n');

    expect(prog.helpInformation()).toEqual(expectedHelpInformation);
  });

  /**
   * Failing because of incorrect stubs
   */
  test.skip('name', () => {
    let prog = program()
      .command('mycommand [options]', 'this is my command')
      .parse(['node', 'test']);

    expect(prog.name).toBeInstanceOf(Function);
    expect(prog.name()).toEqual('test');
    expect(prog.commands[0].name()).toEqual('mycommand');
    expect(prog.commands[1].name()).toEqual('help');

    const output = process.stdout.write.args[0];

    expect(output[0]).toContain(
      ['  mycommand [options]  this is my command'].join('\n')
    );

    sinon.restore();
  });

  /**
   * Failing because of incorrect stubs
   */
  test.skip('name set', () => {
    const prog = program()
      .name('foobar')
      .description('This is a test.');

    expect(prog.name).toBeInstanceOf(Function);
    expect(prog._name).toEqual('foobar');
    expect(prog._description).toEqual('This is a test.');

    const output = process.stdout.write.args[0];

    sinon.restore();
  });

  /**
   * Failing because of incorrect stubs
   */
  test.skip('no conflict', () => {
    let prog = program()
      .version('0.0.1')
      .command('version', 'description')
      .action(() => {
        console.log('Version command invoked');
      })
      .parse(['node', 'test', 'version']);

    var output = process.stdout.write.args[0];
    expect(output[0]).toEqual('Version command invoked\n');

    prog = prog.parse(['node', 'test', '--version']);

    var output = process.stdout.write.args[1];
    expect(output[0]).toEqual('0.0.1\n');

    sinon.restore();
  });

  /**
   * Failing because of incorrect stubs
   */
  test.skip('no help', () => {
    let prog = program()
      .command('mycommand [options]', 'this is my command')
      .command('anothercommand [options]')
      .action(() => {})
      .command('hiddencommand [options]', "you won't see me", {
        noHelp: true
      })
      .command('hideagain [options]', null, { noHelp: true })
      .action(() => {})
      .command('hiddencommandwithoutdescription [options]', {
        noHelp: true
      });

    prog = prog.parse(['node', 'test']);

    expect(prog.name).toBeInstanceOf(Function);
    expect(prog.name()).toEqual('test');
    expect(prog.commands[0].name()).toEqual('mycommand');
    expect(prog.commands[0].noHelp).toBe(false);
    expect(prog.commands[1].name()).toEqual('anothercommand');
    expect(prog.commands[1].noHelp).toBe(false);
    expect(prog.commands[2].name()).toEqual('hiddencommand');
    expect(prog.commands[2].noHelp).toBe(true);
    expect(prog.commands[3].name()).toEqual('hideagain');
    expect(prog.commands[3].noHelp).toBe(true);
    expect(prog.commands[4].name()).toEqual('hiddencommandwithoutdescription');
    expect(prog.commands[4].noHelp).toBe(true);
    expect(prog.commands[5].name()).toEqual('help');

    sinon.restore();
    sinon.stub(process.stdout, 'write');
    prog.outputHelp();

    expect(process.stdout.write.calledOnce).toBe(true);
    expect(process.stdout.write.args.length).toEqual(1);

    const output = process.stdout.write.args[0];

    const expectation = [
      'Commands:',
      '  mycommand [options]       this is my command',
      '  anothercommand [options]',
      '  help [cmd]                display help for [cmd]'
    ].join('\n');
    expect(output[0]).not.toContain(expectation);
  });

  /**
   * Failing because of incorrect stubs
   */
  test.skip('command asterisk', () => {
    let val = false;
    program()
      .version('0.0.1')
      .command('*')
      .description('test')
      .action(() => {
        val = true;
      })
      .parse(['node', 'test']);

    expect(val).toBe(false);
  });

  /**
   * Failing because of incorrect stubs
   */
  test.skip('known', () => {
    const stubError = sinon.stub(console, 'error');

    const cmd = 'my_command';

    program()
      .command(cmd, 'description')
      .parse(['node', 'test', cmd]);

    expect(stubError.callCount).toEqual(0);
    const output = process.stdout.write.args;
    expect(output).toEqual([]);

    sinon.restore();
  });

  test('no command', () => {
    let val = false;
    const prog = program()
      .option('-C, --no-color', 'turn off color output')
      .action(function() {
        val = this.color;
      })
      .parse(['node', 'test']);

    expect(prog.get('color')).toEqual(val);
  });

  test('literal', () => {
    let prog = program()
      .version('0.0.1')
      .option('-f, --foo', 'add some foo')
      .option('-b, --bar', 'add some bar')
      .parse(['node', 'test', '--foo', '--', '--bar', 'baz']);
    expect(prog.get('foo')).toBe(true);
    expect(() => prog.get('bar')).toThrow();
    expect(prog.args).toEqual(['--bar', 'baz']);

    // subsequent literals are passed-through as args
    prog = prog.parse(['node', 'test', '--', 'cmd', '--', '--arg']);
    expect(prog.args).toEqual(['cmd', '--', '--arg']);
  });
});
