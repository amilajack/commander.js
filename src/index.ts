/**
 * Module dependencies.
 */

import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Initialize a new `Option` with the given `flags` and `description`.
 *
 * @param {String} flags
 * @param {String} description
 * @api public
 */

class Option {
  flags: string;

  required: boolean;

  optional: boolean;

  bool: boolean;

  short: string;

  long: string;

  description: string;

  defaultValue: string;

  constructor(flags: string, description: string) {
    this.flags = flags;
    this.required = flags.includes('<');
    this.optional = flags.includes('[');
    this.bool = !flags.includes('-no-');
    const parsedFlags = flags.split(/[ ,|]+/);
    if (parsedFlags.length > 1 && !/^[[<]/.test(parsedFlags[1])) {
      this.short = parsedFlags.shift();
    }
    this.long = parsedFlags.shift();
    this.description = description || '';
  }

  /**
   * Return option name.
   */
  name(): string {
    return this.long.replace('--', '').replace('no-', '');
  }

  /**
   * Return option name, in a camelcase format that can be used
   * as a object attribute key.
   */
  public attributeName(): string {
    return camelcase(this.name());
  }

  /**
   * Check if `arg` matches the short or long flag.
   */
  private is(arg: string): boolean {
    return this.short === arg || this.long === arg;
  }

  /**
   * Returns number of args that are expected by the option.
   * Can only be 0 or 1.
   */
  public arity(): number {
    return this.required || this.optional ? 1 : 0;
  }
}

/**
 * Initialize a new `Command`.
 */

class Command extends EventEmitter {
  public commands: Array<Command> = [];

  public options: Array<Option> = [];

  public executables: boolean;

  public defaultExecutable: string;

  public parent: Command;

  public args: Array<string>;

  /**
   * The running node process from running a subcommand executable
   */
  public runningCommand: () => void;

  public rawArgs: Array<string>;

  private _noHelp: boolean;

  private _execs: Object = {};

  private _argsDescription: Object;

  private _alias: string;

  private _allowUnknownOption: boolean = false;

  private _args: Array<string> = [];

  private _version: string;

  private _description: string;

  private _usage: string;

  private _name: string;

  private _versionOptionName: string;

  private _completionRules = {
    options: {},
    args: {}
  };

  constructor(name: string = '') {
    super();
    this._name = name;
  }

  /**
   * Add command `name`.
   *
   * The `.action()` callback is invoked when the
   * command `name` is specified via __ARGV__,
   * and the remaining arguments are applied to the
   * function for access.
   *
   * When the `name` is "*" an un-matched command
   * will be passed as the first arg, followed by
   * the rest of __ARGV__ remaining.
   *
   * Examples:
   *
   *      program
   *        .version('0.0.1')
   *        .option('-C, --chdir <path>', 'change the working directory')
   *        .option('-c, --config <path>', 'set config path. defaults to ./deploy.conf')
   *        .option('-T, --no-tests', 'ignore test hook')
   *
   *      program
   *        .command('setup')
   *        .description('run remote setup commands')
   *        .action(() => {
   *          console.log('setup');
   *        });
   *
   *      program
   *        .command('exec <cmd>')
   *        .description('run the given remote command')
   *        .action((cmd) => {
   *          console.log('exec "%s"', cmd);
   *        });
   *
   *      program
   *        .command('teardown <dir> [otherDirs...]')
   *        .description('run teardown commands')
   *        .action((dir, otherDirs) => {
   *          console.log('dir "%s"', dir);
   *          if (otherDirs) {
   *            otherDirs.forEach((oDir) => {
   *              console.log('dir "%s"', oDir);
   *            });
   *          }
   *        });
   *
   *      program
   *        .command('*')
   *        .description('deploy the given env')
   *        .action((env) => {
   *          console.log('deploying "%s"', env);
   *        });
   *
   *      program.parse(process.argv);
   *
   * @param {String} name
   * @param {String} [desc] for git-style sub-commands
   * @return {Command} the new command
   */
  public command(
    name: string,
    desc: string,
    opts: { isDefault: boolean; noHelp: boolean }
  ): Command {
    if (typeof desc === 'object' && desc !== null) {
      opts = desc;
      desc = null;
    }
    opts = opts || {};
    const args = name.split(/ +/);
    const cmd = new Command(args.shift());

    if (desc) {
      cmd.description(desc);
      this.executables = true;
      this._execs[cmd._name] = true;
      if (opts.isDefault) this.defaultExecutable = cmd._name;
    }
    cmd._noHelp = !!opts.noHelp;
    this.commands.push(cmd);
    cmd.parseExpectedArgs(args);
    cmd.parent = this;

    if (desc) return this;
    return cmd;
  }

  /**
   * Define argument syntax for the top-level command.
   */
  public arguments(desc: string) {
    return this.parseExpectedArgs(desc.split(/ +/));
  }

  /**
   * Add an implicit `help [cmd]` subcommand
   * which invokes `--help` for the given command.
   */
  private addImplicitHelpCommand() {
    this.command('help [cmd]', 'display help for [cmd]');
  }

  /**
   * Parse expected `args`.
   *
   * For example `["[type]"]` becomes `[{ required: false, name: 'type' }]`.
   */
  public parseExpectedArgs(args: Array<string>): Command {
    if (!args.length) return;
    const self = this;
    args.forEach(arg => {
      const argDetails = {
        required: false,
        name: '',
        variadic: false
      };

      switch (arg[0]) {
        case '<':
          argDetails.required = true;
          argDetails.name = arg.slice(1, -1);
          break;
        case '[':
          argDetails.name = arg.slice(1, -1);
          break;
      }

      if (argDetails.name.length > 3 && argDetails.name.slice(-3) === '...') {
        argDetails.variadic = true;
        argDetails.name = argDetails.name.slice(0, -3);
      }
      if (argDetails.name) {
        self._args.push(argDetails);
      }
    });
    return this;
  }

  /**
   * Register callback `fn` for the command.
   *
   * Examples:
   *
   *      program
   *        .command('help')
   *        .description('display verbose help')
   *        .action(() => {
   *           // output help here
   *        });
   *
   * @param {Function} fn
   * @return {Command} for chaining
   */
  action(fn: Function): Command {
    const self = this;
    const listener = (args = [], unknown = []) => {
      const parsed = self.parseOptions(unknown);

      // Output help if necessary
      outputHelpIfNecessary(self, parsed.unknown);

      // If there are still any unknown options, then we simply
      // die, unless someone asked for help, in which case we give it
      // to them, and then we die.
      if (parsed.unknown.length > 0) {
        self.unknownOption(parsed.unknown[0]);
      }

      // Leftover arguments need to be pushed back. Fixes issue #56
      if (parsed.args.length) args = parsed.args.concat(args);

      self._args.forEach((arg, i) => {
        if (arg.required && args[i] == null) {
          self.missingArgument(arg.name);
        } else if (arg.variadic) {
          if (i !== self._args.length - 1) {
            self.variadicArgNotLast(arg.name);
          }

          args[i] = args.splice(i);
        }
      });

      // Always append ourselves to the end of the arguments,
      // to make sure we match the number of arguments the user
      // expects
      if (self._args.length) {
        args[self._args.length] = self;
      } else {
        args.push(self);
      }

      fn.apply(self, args);
    };
    const parent = this.parent || this;
    const name = parent === this ? '*' : this._name;
    parent.on(`command:${name}`, listener);
    if (this._alias) parent.on(`command:${this._alias}`, listener);
    return this;
  }

  /**
   * Define option with `flags`, `description` and optional
   * coercion `fn`.
   *
   * The `flags` string should contain both the short and long flags,
   * separated by comma, a pipe or space. The following are all valid
   * all will output this way when `--help` is used.
   *
   *    "-p, --pepper"
   *    "-p|--pepper"
   *    "-p --pepper"
   *
   * Examples:
   *
   *     // simple boolean defaulting to false
   *     program.option('-p, --pepper', 'add pepper');
   *
   *     --pepper
   *     program.pepper
   *     // => Boolean
   *
   *     // simple boolean defaulting to true
   *     program.option('-C, --no-cheese', 'remove cheese');
   *
   *     program.cheese
   *     // => true
   *
   *     --no-cheese
   *     program.cheese
   *     // => false
   *
   *     // required argument
   *     program.option('-C, --chdir <path>', 'change the working directory');
   *
   *     --chdir /tmp
   *     program.chdir
   *     // => "/tmp"
   *
   *     // optional argument
   *     program.option('-c, --cheese [type]', 'add cheese [marble]');
   *
   * @param {String} flags
   * @param {String} description
   * @param {Function|*} [fn] or default
   * @param {*} [defaultValue]
   * @return {Command} for chaining
   */
  option(
    flags: string,
    description: string,
    fn: Function,
    defaultValue: any
  ): Command {
    const self = this;
    const option = new Option(flags, description);
    const oname = option.name();
    const name = option.attributeName();

    // default as 3rd arg
    if (typeof fn !== 'function') {
      if (fn instanceof RegExp) {
        const regex: RegExp = fn;
        fn = (val: any, def: any) => {
          const m = regex.exec(val);
          return m ? m[0] : def;
        };
      } else {
        defaultValue = fn;
        fn = null;
      }
    }

    // preassign default value only for --no-*, [optional], or <required>
    if (!option.bool || option.optional || option.required) {
      // when --no-* we make sure default is true
      if (!option.bool) defaultValue = true;
      // preassign only if we have a default
      if (defaultValue !== undefined) {
        self[name] = defaultValue;
        option.defaultValue = defaultValue;
      }
    }

    // register the option
    this.options.push(option);

    // when it's passed assign the value
    // and conditionally invoke the callback
    this.on(`option:${oname}`, val => {
      // coercion
      if (val !== null && fn) {
        val = fn(val, self[name] === undefined ? defaultValue : self[name]);
      }

      // unassigned or bool
      if (
        typeof self[name] === 'boolean' ||
        typeof self[name] === 'undefined'
      ) {
        // if no value, bool true, and we have a default, then use it!
        if (val == null) {
          self[name] = option.bool ? defaultValue || true : false;
        } else {
          self[name] = val;
        }
      } else if (val !== null) {
        // reassign
        self[name] = val;
      }
    });

    return this;
  }

  /**
   * Allow unknown options on the command line.
   *
   * @param {Boolean} arg if `true` or omitted, no error will be thrown
   * for unknown options.
   */
  public allowUnknownOption(arg: boolean) {
    this._allowUnknownOption = arguments.length === 0 || arg;
    return this;
  }

  /**
   * Define completionRules which will later be used by autocomplete to generate appropriate response
   *
   * @param {Object} completion rules
   */
  public complete(rules: {
    options: {};
    arguments: Array<string>;
    args: Array<string>;
  }) {
    // merge options
    // this should ensure this._completionRules are always in shape
    if (rules.options) {
      this._completionRules.options = rules.options;
    }

    // support both arguments or args as key
    if (rules.arguments) {
      this._completionRules.args = rules.arguments;
    } else if (rules.args) {
      this._completionRules.args = rules.args;
    }

    return this;
  }

  /**
   * Test if any complete rules has been defined for current command or its subcommands.
   *
   * @return {Boolean}
   */
  private hasCompletionRules(): boolean {
    function isEmptyRule({ options, args }) {
      return (
        Object.keys(options).length === 0 && Object.keys(args).length === 0
      );
    }

    return !(
      isEmptyRule(this._completionRules) &&
      this.commands.every(({ _completionRules }) =>
        isEmptyRule(_completionRules)
      )
    );
  }

  /**
   * Handle autocomplete if command args starts with special options.
   * It will exit current process after successful processing.
   */
  autocomplete(argv: Array<string>) {
    const RESERVED_STARTING_KEYWORDS = [
      '--completion',
      '--completion-fish',
      '--compzsh',
      '--compbash',
      '--compfish'
    ];
    const firstArg = argv[2];

    if (RESERVED_STARTING_KEYWORDS.includes(firstArg)) {
      // lazy require
      const omelette = require('omelette');
      const executableName = path.basename(argv[1], '.js');
      const self = this;

      const completion = omelette(executableName);

      completion.on('complete', (f: Function, event: Event) => {
        self.autocompleteHandleEvent(event);
      });

      // omelette will call process.exit(0)
      completion.init();
    }

    return this;
  }

  /**
   * Handle omelette complete event
   *
   * @param {Object} omelette event which contains fragment, line, reply info
   */
  private autocompleteHandleEvent(event: Event) {
    if (this.commands.length > 0) {
      // sub command style
      if (event.fragment === 1) {
        // for sub command first complete should return command
        const commands = this.commands.map(c => c.name());

        event.reply(commands.concat(['--help']));
      } else {
        const elements = event.line.split(' ');
        const commandName = elements[1];
        const commandArgs = elements.slice(2, event.fragment);
        const currentCommand = this.commands.find(
          c => c.name() === commandName
        );

        if (currentCommand) {
          event.reply(currentCommand.autocompleteCandidates(commandArgs));
        } else {
          event.reply([]);
        }
      }
    } else {
      // single command style
      const singleCommandArgs = event.line.split(' ').slice(1, event.fragment);

      if (event.fragment === 1) {
        // offer --help for the first complete only
        event.reply(
          this.autocompleteCandidates(singleCommandArgs).concat(['--help'])
        );
      } else {
        event.reply(this.autocompleteCandidates(singleCommandArgs));
      }
    }
  }

  /**
   * Return candidates base on current line input and completionRules.
   * This is the core of smart logic of autocompletion
   *
   * @param {Array} typed args
   * @return {Array} auto complete candidates
   */
  private autocompleteCandidates(typedArgs: Array<string>): Array<string> {
    const completionRules = this.autocompleteNormalizeRules();
    const activeOption = autocompleteActiveOption(
      completionRules.options,
      typedArgs
    );

    if (activeOption) {
      // if current typedArgs suggests it's filling an option
      // next value would be the possible values for that option
      const { reply } = activeOption;

      if (typeof reply === 'function') {
        return reply(typedArgs) || [];
      }
      if (Array.isArray(reply)) {
        return reply;
      }
      return [];
    }
    // otherwise
    // next value would be one of the unused option names
    const optionNames = Object.keys(completionRules.options).filter(name => {
      const option = completionRules.options[name];

      if (option.sibling) {
        // remove both option and its sibling form
        return !typedArgs.includes(name) && !typedArgs.includes(option.sibling);
      }
      return !typedArgs.includes(name);
    });

    // or possible values for next arguments
    const activeArg = autocompleteActiveArg(
      completionRules.options,
      completionRules.args,
      typedArgs
    );

    if (typeof activeArg === 'function') {
      return optionNames.concat(activeArg(typedArgs) || []);
    }
    if (Array.isArray(activeArg)) {
      return optionNames.concat(activeArg);
    }
    return optionNames;
  }

  /**
   * For the ease of processing,
   * the internal presentation of completion rules is quite different from user input.
   *
   * @return {Object} normalized rules
   */
  private autocompleteNormalizeRules(): { options: {} } {
    // supplement with important information including
    // option arity and sibling
    const rawRules = this._completionRules;
    const { options } = this;
    const args = this._args;
    const normalizedRules = { options: {}, args: [] };

    options.forEach(option => {
      if (option.short) {
        const reply =
          rawRules.options[option.long] || rawRules.options[option.short] || [];

        normalizedRules.options[option.short] = {
          arity: option.arity(),
          sibling: option.long,
          reply
        };

        normalizedRules.options[option.long] = {
          arity: option.arity(),
          sibling: option.short,
          reply
        };
      } else {
        normalizedRules.options[option.long] = {
          arity: option.arity(),
          sibling: null,
          reply: rawRules.options[option.long] || []
        };
      }
    });

    args.forEach(({ name }) => {
      normalizedRules.args.push(rawRules.args[name] || []);
    });

    return normalizedRules;
  }

  /**
   * Parse `argv`, settings options and invoking commands when defined.
   *
   * @param {Array} argv
   * @return {Command} for chaining
   */
  public parse(argv: Array<string>): Command {
    // trigger autocomplete first if some completion rules have been defined
    if (this.hasCompletionRules()) {
      this.autocomplete(argv);
    }

    // implicit help
    if (this.executables) this.addImplicitHelpCommand();

    // store raw args
    this.rawArgs = argv;

    // guess name
    this._name = this._name || path.basename(argv[1], '.js');

    // github-style sub-commands with no sub-command
    if (this.executables && argv.length < 3 && !this.defaultExecutable) {
      // this user needs help
      argv.push('--help');
    }

    // process argv
    const parsed = this.parseOptions(this.normalize(argv.slice(2)));
    const args = (this.args = parsed.args);

    const result = this.parseArgs(this.args, parsed.unknown);

    // executable sub-commands
    const name = result.args[0];

    let aliasCommand = null;
    // check alias of sub commands
    if (name) {
      aliasCommand = this.commands.filter(
        command => command.alias() === name
      )[0];
    }

    if (this._execs[name] && typeof this._execs[name] !== 'function') {
      return this.executeSubCommand(argv, args, parsed.unknown);
    }
    if (aliasCommand) {
      // is alias of a subCommand
      args[0] = aliasCommand._name;
      return this.executeSubCommand(argv, args, parsed.unknown);
    }
    if (this.defaultExecutable) {
      // use the default subcommand
      args.unshift(this.defaultExecutable);
      return this.executeSubCommand(argv, args, parsed.unknown);
    }

    // Output unknown command error
    if (args.length > 0) {
      console.error('error: unknown command %s', args[0]);
      this.outputHelp();
    }

    return result;
  }

  /**
   * Execute a sub-command executable.
   *
   * @param {Array} argv
   * @param {Array} args
   * @param {Array} unknown
   */
  private executeSubCommand(
    argv: Array<string>,
    args: Array<string>,
    unknown: Array<any>
  ) {
    args = args.concat(unknown);

    if (!args.length) this.help();
    if (args[0] === 'help' && args.length === 1) this.help();

    // <cmd> --help
    if (args[0] === 'help') {
      args[0] = args[1];
      args[1] = '--help';
    }

    // executable
    const f = argv[1];
    // name of the subcommand, link `pm-install`
    let bin = `${path.basename(f, path.extname(f))}-${args[0]}`;

    // In case of globally installed, get the base dir where executable
    //  subcommand file should be located at
    let link = fs.lstatSync(f).isSymbolicLink() ? fs.readlinkSync(f) : f;

    // when symbolink is relative path
    if (link !== f && link.charAt(0) !== '/') {
      link = path.join(path.dirname(f), link);
    }
    const baseDir = path.dirname(link);

    // prefer local `./<bin>` to bin in the $PATH
    const localBin = path.join(baseDir, bin);

    // whether bin file is a js script with explicit `.js` or `.ts` extension
    let isExplicitJS = false;
    if (fs.existsSync(`${localBin}.js`)) {
      bin = `${localBin}.js`;
      isExplicitJS = true;
    } else if (fs.existsSync(`${localBin}.ts`)) {
      bin = `${localBin}.ts`;
      isExplicitJS = true;
    } else if (fs.existsSync(localBin)) {
      bin = localBin;
    }

    args = args.slice(1);

    let proc;
    if (process.platform !== 'win32') {
      if (isExplicitJS) {
        args.unshift(bin);
        // add executable arguments to spawn
        args = (process.execArgv || []).concat(args);

        proc = spawn(process.argv[0], args, {
          stdio: 'inherit',
          customFds: [0, 1, 2]
        });
      } else {
        proc = spawn(bin, args, { stdio: 'inherit', customFds: [0, 1, 2] });
      }
    } else {
      args.unshift(bin);
      proc = spawn(process.execPath, args, { stdio: 'inherit' });
    }

    const signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
    signals.forEach(signal => {
      process.on(signal, () => {
        if (proc.killed === false && proc.exitCode === null) {
          proc.kill(signal);
        }
      });
    });
    proc.on('close', process.exit.bind(process));
    proc.on('error', ({ code }: { code: string }) => {
      if (code === 'ENOENT') {
        console.error('error: %s(1) does not exist, try --help', bin);
      } else if (code === 'EACCES') {
        console.error(
          'error: %s(1) not executable. try chmod or run with root',
          bin
        );
      }
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    });

    // Store the reference to the child process
    this.runningCommand = proc;
  }

  /**
   * Normalize `args`, splitting joined short flags. For example
   * the arg "-abc" is equivalent to "-a -b -c".
   * This also normalizes equal sign and splits "--abc=def" into "--abc def".
   *
   * @param {Array} args
   * @return {Array}
   */
  private normalize(args: Array<string>): Array<string> {
    let ret = [];
    let arg;
    let lastOpt;
    let index;

    for (let i = 0, len = args.length; i < len; ++i) {
      arg = args[i];
      if (i > 0) {
        lastOpt = this.optionFor(args[i - 1]);
      }

      if (arg === '--') {
        // Honor option terminator
        ret = ret.concat(args.slice(i));
        break;
      } else if (lastOpt && lastOpt.required) {
        ret.push(arg);
      } else if (arg.length > 1 && arg[0] === '-' && arg[1] !== '-') {
        arg
          .slice(1)
          .split('')
          .forEach(c => {
            ret.push(`-${c}`);
          });
      } else if (/^--/.test(arg) && ~(index = arg.indexOf('='))) {
        ret.push(arg.slice(0, index), arg.slice(index + 1));
      } else {
        ret.push(arg);
      }
    }

    return ret;
  }

  /**
   * Parse command `args`.
   *
   * When listener(s) are available those
   * callbacks are invoked, otherwise the "*"
   * event is emitted and those actions are invoked.
   *
   * @param {Array} args
   * @return {Command} for chaining
   */
  private parseArgs(args: Array<string>, unknown: any): Command {
    let name;

    if (args.length) {
      name = args[0];
      if (this.listeners(`command:${name}`).length) {
        this.emit(`command:${args.shift()}`, args, unknown);
      } else {
        this.emit('command:*', args);
      }
    } else {
      outputHelpIfNecessary(this, unknown);

      // If there were no args and we have unknown options,
      // then they are extraneous and we need to error.
      if (unknown.length > 0) {
        this.unknownOption(unknown[0]);
      }
      if (
        this.commands.length === 0 &&
        this._args.filter(({ required }: { required: boolea }) => required)
          .length === 0
      ) {
        this.emit('command:*');
      }
    }

    return this;
  }

  /**
   * Return an option matching `arg` if any.
   *
   * @param {String} arg
   * @return {Option}
   */
  private optionFor(arg: String): Option {
    for (let i = 0, len = this.options.length; i < len; ++i) {
      if (this.options[i].is(arg)) {
        return this.options[i];
      }
    }
  }

  /**
   * Parse options from `argv` returning `argv`
   * void of these options.
   *
   * @param {Array} argv
   * @return {Array}
   */
  parseOptions(
    argv: Array<string>
  ): { args: Array<string>; unknown: Array<string> } {
    const args = [];
    const len = argv.length;
    let literal;
    let option;
    let arg;

    const unknownOptions = [];

    // parse options
    for (let i = 0; i < len; ++i) {
      arg = argv[i];

      // literal args after --
      if (literal) {
        args.push(arg);
        continue;
      }

      if (arg === '--') {
        literal = true;
        continue;
      }

      // find matching Option
      option = this.optionFor(arg);

      // option is defined
      if (option) {
        // requires arg
        if (option.required) {
          arg = argv[++i];
          if (arg == null) return this.optionMissingArgument(option);
          this.emit(`option:${option.name()}`, arg);
          // optional arg
        } else if (option.optional) {
          arg = argv[i + 1];
          if (arg == null || (arg[0] === '-' && arg !== '-')) {
            arg = null;
          } else {
            ++i;
          }
          this.emit(`option:${option.name()}`, arg);
          // bool
        } else {
          this.emit(`option:${option.name()}`);
        }
        continue;
      }

      // looks like an option
      if (arg.length > 1 && arg[0] === '-') {
        unknownOptions.push(arg);

        // If the next argument looks like it might be
        // an argument for this option, we pass it on.
        // If it isn't, then it'll simply be ignored
        if (i + 1 < argv.length && argv[i + 1][0] !== '-') {
          unknownOptions.push(argv[++i]);
        }
        continue;
      }

      // arg
      args.push(arg);
    }

    return { args, unknown: unknownOptions };
  }

  /**
   * Return an object containing options as key-value pairs
   *
   * @return {Object}
   */
  opts(): Object {
    const result = {};
    const len = this.options.length;

    for (let i = 0; i < len; i++) {
      const key = this.options[i].attributeName();
      result[key] = key === this._versionOptionName ? this._version : this[key];
    }
    return result;
  }

  /**
   * Argument `name` is missing.
   *
   * @param {String} name
   */
  missingArgument(name: string) {
    console.error('error: missing required argument `%s`', name);
    process.exit(1);
  }

  /**
   * `Option` is missing an argument, but received `flag` or nothing.
   *
   * @param {String} option
   * @param {String} flag
   */
  optionMissingArgument({ flags }: Option, flag: string) {
    if (flag) {
      console.error(
        'error: option `%s` argument missing, got `%s`',
        flags,
        flag
      );
    } else {
      console.error('error: option `%s` argument missing', flags);
    }
    process.exit(1);
  }

  /**
   * Unknown option `flag`.
   *
   * @param {String} flag
   */
  unknownOption(flag: string) {
    if (this._allowUnknownOption) return;
    console.error('error: unknown option `%s`', flag);
    process.exit(1);
  }

  /**
   * Variadic argument with `name` is not the last argument as required.
   *
   * @param {String} name
   */
  variadicArgNotLast(name: string) {
    console.error('error: variadic arguments must be last `%s`', name);
    process.exit(1);
  }

  /**
   * Set the program version to `str`.
   *
   * This method auto-registers the "-V, --version" flag
   * which will print the version number when passed.
   *
   * @param {String} str
   * @param {String} [flags]
   * @return {Command} for chaining
   */
  version(str: string, flags: string): Command {
    if (arguments.length === 0) return this._version;
    this._version = str;
    flags = flags || '-V, --version';
    const versionOption = new Option(flags, 'output the version number');
    this._versionOptionName = versionOption.long.substr(2) || 'version';
    this.options.push(versionOption);
    this.on(`option:${this._versionOptionName}`, () => {
      process.stdout.write(`${str}\n`);
      process.exit(0);
    });
    return this;
  }

  /**
   * Set the description to `str`.
   *
   * @param {String} str
   * @param {Object} argsDescription
   * @return {String|Command}
   */
  description(str: string, argsDescription: Object): string | Command {
    if (arguments.length === 0) return this._description;
    this._description = str;
    this._argsDescription = argsDescription;
    return this;
  }

  /**
   * Set an alias for the command
   *
   * @param {String} alias
   * @return {String|Command}
   */
  public alias(alias: string): string | Command {
    let command = this;
    if (this.commands.length !== 0) {
      command = this.commands[this.commands.length - 1];
    }

    if (arguments.length === 0) return command._alias;

    if (alias === command._name)
      throw new Error("Command alias can't be the same as its name");

    command._alias = alias;
    return this;
  }

  /**
   * Set / get the command usage `str`.
   *
   * @param {String} str
   * @return {String|Command}
   */
  usage(str: string): string | Command {
    const args = this._args.map(arg => humanReadableArgName(arg));

    const usage = `[options]${this.commands.length ? ' [command]' : ''}${
      this._args.length ? ` ${args.join(' ')}` : ''
    }`;

    if (arguments.length === 0) return this._usage || usage;
    this._usage = str;

    return this;
  }

  /**
   * Get or set the name of the command
   *
   * @param {String} str
   * @return {String|Command}
   */
  name(str: string): string | Command {
    if (arguments.length === 0) return this._name;
    this._name = str;
    return this;
  }

  /**
   * Return prepared commands.
   *
   * @return {Array}
   */
  prepareCommands(): Array<string> {
    return this.commands
      .filter(({ _noHelp }) => !_noHelp)
      .map(cmd => {
        const args = cmd._args.map(arg => humanReadableArgName(arg)).join(' ');

        return [
          cmd._name +
            (cmd._alias ? `|${cmd._alias}` : '') +
            (cmd.options.length ? ' [options]' : '') +
            (args ? ` ${args}` : ''),
          cmd._description
        ];
      });
  }

  /**
   * Return the largest command length.
   *
   * @return {Number}
   */
  private largestCommandLength() {
    const commands = this.prepareCommands();
    return commands.reduce(
      (max, command) => Math.max(max, command[0].length),
      0
    );
  }

  /**
   * Return the largest option length.
   *
   * @return {Number}
   */
  private largestOptionLength(): number {
    const options = [].slice.call(this.options);
    options.push({
      flags: '-h, --help'
    });
    return options.reduce(
      (max: number, { flags }: { flags: string }) =>
        Math.max(max, flags.length),
      0
    );
  }

  /**
   * Return the largest arg length.
   *
   * @return {Number}
   */
  private largestArgLength(): number {
    return this._args.reduce(
      (max: number, { name }: { name: string }) => Math.max(max, name.length),
      0
    );
  }

  /**
   * Return the pad width.
   *
   * @return {Number}
   */
  private padWidth(): number {
    let width = this.largestOptionLength();
    if (this._argsDescription && this._args.length) {
      if (this.largestArgLength() > width) {
        width = this.largestArgLength();
      }
    }

    if (this.commands && this.commands.length) {
      if (this.largestCommandLength() > width) {
        width = this.largestCommandLength();
      }
    }

    return width;
  }

  /**
   * Return help for options.
   *
   * @return {String}
   */
  private optionHelp(): string {
    const width = this.padWidth();

    // Append the help information
    return this.options
      .map(
        ({ flags, description, bool, defaultValue }) =>
          `${pad(flags, width)}  ${description}${
            bool && defaultValue !== undefined
              ? ` (default: ${JSON.stringify(defaultValue)})`
              : ''
          }`
      )
      .concat([`${`${pad('-h, --help', width)}  `}output usage information`])
      .join('\n');
  }

  /**
   * Return command help documentation.
   *
   * @return {String}
   */
  private commandHelp(): string {
    if (!this.commands.length) return '';

    const commands = this.prepareCommands();
    const width = this.padWidth();

    return [
      'Commands:',
      commands
        .map(cmd => {
          const desc = cmd[1] ? `  ${cmd[1]}` : '';
          return (desc ? pad(cmd[0], width) : cmd[0]) + desc;
        })
        .join('\n')
        .replace(/^/gm, '  '),
      ''
    ].join('\n');
  }

  /**
   * Return program help documentation.
   *
   * @return {String}
   */
  private helpInformation(): string {
    let desc: Array<string> = [];
    if (this._description) {
      desc = [this._description, ''];

      const argsDescription = this._argsDescription;
      if (argsDescription && this._args.length) {
        const width = this.padWidth();
        desc.push('Arguments:');
        desc.push('');
        this._args.forEach(({ name }) => {
          desc.push(`  ${pad(name, width)}  ${argsDescription[name]}`);
        });
        desc.push('');
      }
    }

    let cmdName = this._name;
    if (this._alias) {
      cmdName = `${cmdName}|${this._alias}`;
    }
    const usage = [`Usage: ${cmdName} ${this.usage()}`, ''];

    let cmds: Array<string> = [];
    const commandHelp = this.commandHelp();
    if (commandHelp) cmds = [commandHelp];

    const options = [
      'Options:',
      `${this.optionHelp().replace(/^/gm, '  ')}`,
      ''
    ];

    return usage
      .concat(desc)
      .concat(options)
      .concat(cmds)
      .join('\n');
  }

  /**
   * Output help information for this command
   */
  public outputHelp(cb: () => void) {
    if (!cb) {
      cb = passthru => passthru;
    }
    process.stdout.write(cb(this.helpInformation()));
    this.emit('--help');
  }

  /**
   * Output help information and exit.
   */
  public help(cb: () => void) {
    this.outputHelp(cb);
    process.exit();
  }
}

/**
 * Camel-case the given `flag`
 *
 * @param {String} flag
 * @return {String}
 */
function camelcase(flag: string): string {
  return flag
    .split('-')
    .reduce(
      (str: string, word: string) => str + word[0].toUpperCase() + word.slice(1)
    );
}

/**
 * Pad `str` to `width`.
 *
 * @param {String} str
 * @param {Number} width
 * @return {String}
 */
function pad(str: string, width: number): string {
  const len = Math.max(0, width - str.length);
  return str + Array(len + 1).join(' ');
}

/**
 * Output help information if necessary
 *
 * @param {Command} command to output help for
 * @param {Array} array of options to search for -h or --help
 */
function outputHelpIfNecessary(cmd: Command, options: Array<string> = []) {
  for (let i = 0; i < options.length; i++) {
    if (options[i] === '--help' || options[i] === '-h') {
      cmd.outputHelp();
      process.exit(0);
    }
  }
}

/**
 * Takes an argument an returns its human readable equivalent for help usage.
 *
 * @param {Object} arg
 * @return {String}
 */
function humanReadableArgName({
  name,
  variadic,
  required
}: {
  name: string;
  variadic: boolean;
  required: boolean;
}): string {
  const nameOutput = name + (variadic === true ? '...' : '');

  return required ? `<${nameOutput}>` : `[${nameOutput}]`;
}

/**
 * Detect whether current command line input infers an option.
 *
 * @param {Object} normalized option rules
 * @param {Array} typed args
 * @return {Object} active option if found, otherwise false
 */
function autocompleteActiveOption(
  optionRules: Object,
  typedArgs: Array<string>
): Object {
  if (typedArgs.length === 0) {
    return false;
  }

  const lastArg = typedArgs[typedArgs.length - 1];

  if (!optionRules[lastArg]) {
    return false;
  }

  const option = optionRules[lastArg];

  if (option.arity === 0) {
    return false;
  }

  return option;
}

/**
 * Detect whether current command line input infers an arg.
 *
 * @param {Object} normalized option rules
 * @param {Array} normalized arg rules
 * @param {Array} typed args
 * @return {Object} active arg if found, otherwise false
 */
function autocompleteActiveArg(
  optionRules: Object,
  argRules: Array<string>,
  typedArgs: Array<string>
): Object {
  if (argRules.length === 0) {
    return false;
  }

  // find out how many args have already been typed
  let count = 0;
  let curr = 0;

  while (curr < typedArgs.length) {
    const currStr = typedArgs[curr];

    if (optionRules[currStr]) {
      curr += optionRules[currStr].arity + 1;
    } else {
      count += 1;
      curr += 1;
    }
  }

  if (argRules.length > count) {
    return argRules[count];
  }
  return false;
}

/**
 * Expose the root command.
 */

export default new Command();

/**
 * Expose `Command`.
 */

export { Command };

/**
 * Expose `Option`.
 */

export { Option };
