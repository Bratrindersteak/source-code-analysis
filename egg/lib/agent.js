'use strict';

const path = require('path');
const ms = require('ms');
const EggApplication = require('./egg');
const AgentWorkerLoader = require('./loader').AgentWorkerLoader;

const EGG_LOADER = Symbol.for('egg#loader');
const EGG_PATH = Symbol.for('egg#eggPath');

/**
 * Singleton instance in Agent Worker, extend {@link EggApplication}
 * @augments EggApplication
 */
class Agent extends EggApplication {
  /**
   * @class
   * @param {Object} options - see {@link EggApplication}
   */
  constructor(options = {}) {
    options.type = 'agent';
    super(options);

    this.loader.load();

    // dump config after loaded, ensure all the dynamic modifications will be recorded
    const dumpStartTime = Date.now();
    this.dumpConfig();
    this.coreLogger.info(
      '[egg:core] dump config after load, %s',
      ms(Date.now() - dumpStartTime)
    );

    // keep agent alive even it doesn't have any io tasks
    this.agentAliveHandler = setInterval(() => {}, 24 * 60 * 60 * 1000);

    this._uncaughtExceptionHandler = this._uncaughtExceptionHandler.bind(this);
    process.on('uncaughtException', this._uncaughtExceptionHandler);
  }

  _uncaughtExceptionHandler(err) {
    if (!(err instanceof Error)) {
      err = new Error(String(err));
    }
    /* istanbul ignore else */
    if (err.name === 'Error') {
      err.name = 'unhandledExceptionError';
    }
    this.coreLogger.error(err);
  }

  get [EGG_LOADER]() {
    return AgentWorkerLoader;
  }

  get [EGG_PATH]() {
    return path.join(__dirname, '..');
  }

  _wrapMessenger() {
    for (const methodName of [
      'broadcast',
      'sendTo',
      'sendToApp',
      'sendToAgent',
      'sendRandom',
    ]) {
      wrapMethod(methodName, this.messenger, this.coreLogger);
    }

    function wrapMethod(methodName, messenger, logger) {
      const originMethod = messenger[methodName];
      messenger[methodName] = function() {
        const stack = new Error().stack.split('\n').slice(1).join('\n');
        logger.warn(
          "agent can't call %s before server started\n%s",
          methodName,
          stack
        );
        originMethod.apply(this, arguments);
      };
      messenger.prependOnceListener('egg-ready', () => {
        messenger[methodName] = originMethod;
      });
    }
  }

  close() {
    process.removeListener('uncaughtException', this._uncaughtExceptionHandler);
    clearInterval(this.agentAliveHandler);
    return super.close();
  }
}

module.exports = Agent;
