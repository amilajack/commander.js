import program from '../src';
import joker from '@amilajack/joker';

describe('Basic', () => {
    it('should do basic stuff', () => {
        program
            .version('0.0.1')
            .description('Fake package manager')
            .command('install [name]', 'install one or more packages')
            .alias('i')
            .command('search [query]', 'search with optional query')
            .alias('s')
            .command('list', 'list packages installed')
            .command('publish', 'publish the package')
            .alias('p')
            .parse(process.argv);
    })
})