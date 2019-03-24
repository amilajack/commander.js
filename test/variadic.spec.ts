import util from 'util';
import program from '../src';

describe.skip('variadic', () => {
  test('args', () => {
    const programArgs = [
      'node',
      'test',
      'mycommand',
      'arg0',
      'arg1',
      'arg2',
      'arg3'
    ];
    let requiredArg;
    let variadicArg;

    const prog = program()
      .version('0.0.1')
      .command('mycommand <id> [variadicArg...]')
      .action((arg0: string, arg1: string) => {
        requiredArg = arg0;
        variadicArg = arg1;
      })
      .init(programArgs);

    expect(requiredArg).toEqual('arg0');
    expect(variadicArg).toEqual(['arg1', 'arg2', 'arg3']);

    expect(prog.args).toHaveLength(3);
    expect(prog.args[0]).toEqual('arg0');
    expect(prog.args[1]).toEqual(['arg1', 'arg2', 'arg3']);

    const prog2 = program()
      .version('0.0.1')
      .command('mycommand <variadicArg...> [optionalArg]')
      .action(() => {});

    // Make sure we still catch errors with required values for options
    const consoleErrors: string[] = [];
    const oldProcessExit = process.exit;
    const oldConsoleError = console.error;
    let errorMessage;

    process.exit = () => {
      throw new Error(consoleErrors.join('\n'));
    };
    console.error = () => {
      consoleErrors.push(util.format.apply(util, arguments));
    };

    try {
      prog2.init(programArgs);
    } catch (err) {
      errorMessage = err.message;
    }

    process.exit = oldProcessExit;
    console.error = oldConsoleError;

    expect('error: variadic arguments must be last `variadicArg`').toEqual(
      errorMessage
    );
  });
});
