const vm = require('vm')
const repl = require('repl')
const json5 = require('json5')
const config = require('./config')
const context = require('./context')
const validate = require('is-var-name')
const stringArgv = require('string-argv')

const sandbox = vm.createContext(context)

module.exports = (cmd, ctx, filename, callback) => {
  let result
  try {
    if (typeof context[stringArgv(cmd)[0]] === 'function') {
      cmd = cmd.split(/\s*\|\s*/).map((subcmd, pipeLevel) => {
        let argv = stringArgv(subcmd)
        let arglist = argv.slice(1).map(arg => {
          try {
            arg = json5.parse(arg)
          } catch (e) { }

          if (typeof context[arg] !== 'undefined' && validate(arg)) {
            return arg
          } else {
            return json5.stringify(arg)
          }
        })
        if (pipeLevel) {
          arglist.push('_')
        }
        let invocation = argv[0] + '(' + arglist.join(', ') + ')'
        if (pipeLevel) {
          invocation = (pipeLevel ? '.filter(_ => ' : '') + invocation + ')'
        }
        return invocation
      }).join('')
    }

    process.stdout.moveCursor(0, -1)
    process.stdout.clearLine(0)
    console.log(config._lastPrompt.split('\n').slice(-1)[0] + config.colorizeCommand(cmd))
    result = vm.runInContext(cmd, sandbox)
  } catch (e) {
    if (e.name === 'SyntaxError' && /^(Unexpected end of input|Unexpected token)/.test(e.message)) {
      return callback(new repl.Recoverable(e))
    } else {
      throw e
    }
  }
  callback(null, result)
}