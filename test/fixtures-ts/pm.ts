#!/usr/bin/env node

import program from '../../src';

program()
  .version('0.0.1')
  .command('install [name]', 'install one or more packages')
  .init();
