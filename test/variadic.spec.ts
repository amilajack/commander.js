import program from '../src';

describe('variadic', () => {
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

    expect(prog.get('args')).toHaveLength(3);
    expect(prog.get('args')[0]).toEqual('arg0');
    expect(prog.get('args')[1]).toEqual(['arg1', 'arg2', 'arg3']);

    const prog2 = program()
      .version('0.0.1')
      .command('mycommand <variadicArg...> [optionalArg]')
      .action(() => {});

    let errorMessage;

    try {
      prog2.init(programArgs);
    } catch (err) {
      errorMessage = err.message;
    }

    expect('error: variadic arguments must be last `variadicArg`').toEqual(
      errorMessage
    );
  });
});
