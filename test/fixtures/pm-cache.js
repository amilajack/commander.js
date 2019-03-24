#!/usr/bin/env node
const program = require('./pm');

program
  .command('clear', 'clear the cache')
  .command('validate', 'validate the cache', { isDefault: true })
  .init();
