#!/usr/bin/env node

const { spawnSync } = require('child_process');
const { readdirSync } = require('fs');
const { extname, join } = require('path');

describe('commander', () => {
  readdirSync(__dirname).forEach(file => {
    it(`${file}`, () => {
      if (!file.startsWith('test.') || extname(file) !== '.js') return;
      const result = spawnSync(process.argv0, [join('test', file)]);
      if (result.status !== 0) {
        throw new Error(result.stderr);
      }
    });
  });
});
