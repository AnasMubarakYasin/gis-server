const fs = require("fs");
const path = require("path");
const Logger = require("./logger");
const chalk = require("chalk");
const winston = require("winston");

/**
 * @deprecated Don't use it while
 */
module.exports = class SSE {
  /**
   * @type {App.Lib.SSE.Options}
   */
  opts;
  /**
   * @type {App.Lib.Logger.Instance}
   */
  logger;
  /**
   * @type {winston.Logger}
   */
  #logger;
  /**
   * @param {App.Lib.SSE.Options} opts
   */
  constructor(opts) {
    this.opts = opts;
    if (!opts.logger) {
      this.logger = new Logger({
        context: `server-sent-event`,
      });
    } else {
      this.logger = opts.logger;
    }
    const app = this.opts.app;
    this.opts.app.route(this.opts.prefix).get(function (req, res, nx) {
      app(req, res, nx);
    });
  }
  /**
   * @param {string} name
   * @param {App.Lib.SSE.Handler[]} handlers
   */
  use(name, ...handlers) {
    this.opts.app.use(name, ...handlers);
  }
};
