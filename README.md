# Dark

[![Build Status](https://dev.azure.com/amilajack/amilajack/_apis/build/status/amilajack.dark?branchName=master)](https://dev.azure.com/amilajack/amilajack/_build/latest?definitionId=9&branchName=master)

> ## 🛠 Status: In Development
> Dark is currently in development. It's on the fast track to a 1.0 release, so we encourage you to use it and give us your feedback, but there are things that haven't been finalized yet and you can expect some changes.

## Goals

Dark is a fork of [commander.js](https://github.com/tj/commander.js/) with the following goals:

* **Customizability**: Users can override the built in templates (.i.e default help prompt template) by importing templates
* **Type Safe**: Improved compatibility with type systems
* **Improved Documentation**: Provide a plethora of examples along with high quality API docs
* **Coloring**: Built in support for colored output

## Installation

```bash
npm install dark
```

## A Taste

1. Build the CLI app:

```js
// index.js
const { default: dark } = require('dark');

const program = dark()
  .version('0.1.0')
  .option('-p, --peppers', 'Add peppers')
  .option('-P, --pineapple', 'Add pineapple')
  .option('-b, --bbq-sauce', 'Add bbq sauce')
  .option('-c, --cheese [type]', 'Add the specified type of cheese [marble]', 'marble')
  .parse(process.argv);

console.log('you ordered a pizza with:');
if (program.get('peppers')) console.log('  - peppers');
if (program.get('pineapple')) console.log('  - pineapple');
if (program.get('bbqSauce')) console.log('  - bbq');
console.log('  - %s cheese', program.get('cheese'));
```

2. Run it!:
```bash
node index.js -c                  # cheese
node index.js -c -p               # cheese and peppers
node index.js --cheese --peppers  # cheese and peppers
```

## Docs

See the [API docs](https://amilajack.github.io/dark/)

## Support

Do you like this project? Star the repository, spread the word - it really helps. You may want to follow
me on [Twitter](https://twitter.com/amilajack) and
[GitHub](https://github.com/amilajack). Thanks!

If this project is saving you (or your team) time, please consider supporting it on Patreon 👍 thank you!

<p>
  <a href="https://www.patreon.com/amilajack">
    <img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160">
  </a>
</p>

## Prior Art

* [commander.js](https://github.com/tj/commander.js/)
* [oclif](https://github.com/oclif/oclif)

## Related

* [**joker**](https://github.com/amilajack/joker/): A modern and intuitive testing library for command-line apps
* [**ink**](https://github.com/vadimdemedes/ink/): React for interactive command-line apps
