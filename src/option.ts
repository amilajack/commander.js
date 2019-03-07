/**
 * Camel-case the given `flag`
 *
 * @param flag
 */
function camelcase(flag: string): string {
  return flag
    .split('-')
    .reduce(
      (str: string, word: string) => str + word[0].toUpperCase() + word.slice(1)
    );
}

/**
 * Initialize a new [[Option]] with the given `flags` and `description`.
 *
 * @param flags
 * @param description
 */

export default class Option {
  public flags: string;

  public required: boolean;

  public optional: boolean;

  public bool: boolean;

  public short: string;

  public long: string;

  public description: string;

  public defaultValue: string;

  public constructor(flags: string, description: string) {
    this.flags = flags;
    this.required = flags.includes('<');
    this.optional = flags.includes('[');
    this.bool = !flags.includes('-no-');
    const parsedFlags = flags.split(/[ ,|]+/);
    if (parsedFlags.length > 1 && !/^[[<]/.test(parsedFlags[1])) {
      this.short = parsedFlags.shift() || '';
    }
    this.long = parsedFlags.shift() || '';
    this.description = description || '';
  }

  /**
   * Return option name.
   */
  public name(): string {
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
   * Check if `arg` matches the short or long flag. Internally used to check
   * if an arg belongs to an [[Option]]
   */
  is(arg: string): boolean {
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
