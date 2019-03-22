import program from '../src';
import should from 'should';

describe.skip('autocomplete', () => {
  test('single', () => {
    const prog = program();
    prog.hasCompletionRules().should.be.false();

    prog
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

    prog.hasCompletionRules().should.be.true();

    prog.autocompleteNormalizeRules().should.deepEqual({
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

    prog
      .autocompleteCandidates([])
      .should.deepEqual([
        '--verbose',
        '-o',
        '--output',
        '--debug-level',
        '-m',
        'file1.c',
        'file2.c'
      ]);

    prog
      .autocompleteCandidates(['--verbose'])
      .should.deepEqual([
        '-o',
        '--output',
        '--debug-level',
        '-m',
        'file1.c',
        'file2.c'
      ]);

    prog.autocompleteCandidates(['-o']).should.deepEqual(['file1', 'file2']);

    prog
      .autocompleteCandidates(['--output'])
      .should.deepEqual(['file1', 'file2']);

    prog
      .autocompleteCandidates(['--debug-level'])
      .should.deepEqual(['info', 'error']);

    prog.autocompleteCandidates(['-m']).should.deepEqual(['-m']);

    prog
      .autocompleteCandidates(['--verbose', '-m'])
      .should.deepEqual(['--verbose', '-m']);

    prog
      .autocompleteCandidates([
        '--verbose',
        '-o',
        'file1',
        '--debug-level',
        'info',
        '-m',
        'production'
      ])
      .should.deepEqual(['file1.c', 'file2.c']);

    // nothing to complete
    prog
      .autocompleteCandidates([
        '--verbose',
        '-o',
        'file1',
        '--debug-level',
        'info',
        '-m',
        'production',
        'file1.c'
      ])
      .should.deepEqual([]);

    // place arguments in different position
    prog
      .autocompleteCandidates([
        'file1.c',
        '-o',
        'file1',
        '--debug-level',
        'info',
        '-m',
        'production'
      ])
      .should.deepEqual(['--verbose']);

    // should handle the case
    // when provide more args than expected
    prog
      .autocompleteCandidates([
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
      .should.deepEqual([]);
  });

  test('subcommand', () => {
    prog
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

    prog.hasCompletionRules().should.be.true();

    var rootReply = sinon.spy();

    prog.autocompleteHandleEvent({
      reply: rootReply,
      fragment: 1,
      line: 'git'
    });

    rootReply.calledOnce.should.be.true();
    rootReply.getCall(0).args[0].should.deepEqual(['clone', 'add', '--help']);

    var cloneReply = sinon.spy();

    prog.autocompleteHandleEvent({
      reply: cloneReply,
      fragment: 2,
      line: 'git clone'
    });

    cloneReply.calledOnce.should.be.true();
    cloneReply
      .getCall(0)
      .args[0].should.deepEqual([
        '--debug-level',
        'https://github.com/1',
        'https://github.com/2'
      ]);

    var cloneWithOptionReply = sinon.spy();

    prog.autocompleteHandleEvent({
      reply: cloneWithOptionReply,
      fragment: 3,
      line: 'git clone --debug-level'
    });

    cloneWithOptionReply.calledOnce.should.be.true();
    cloneWithOptionReply.getCall(0).args[0].should.deepEqual(['info', 'error']);

    var addReply = sinon.spy();

    prog.autocompleteHandleEvent({
      reply: addReply,
      fragment: 2,
      line: 'git add'
    });

    addReply.calledOnce.should.be.true();
    addReply
      .getCall(0)
      .args[0].should.deepEqual(['-A', '--debug-level', 'file1.c', 'file11.c']);

    var addWithArgReply = sinon.spy();

    prog.autocompleteHandleEvent({
      reply: addWithArgReply,
      fragment: 3,
      line: 'git add file1.c'
    });

    addWithArgReply.calledOnce.should.be.true();
    addWithArgReply
      .getCall(0)
      .args[0].should.deepEqual(['-A', '--debug-level', 'file2.c', 'file21.c']);
  });
});
