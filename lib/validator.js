const { default: Ajv } = require("ajv");
const { default: AjvErrors } = require("ajv-errors");
const Logger = require("#root/lib/logger");
const Interchange = require("#root/lib/interchange");

/**
 * @namespace NSValidator
 */
/**
 * @typedef {Object} NSValidator.Schema
 * @property {import('ajv').Schema | string} [params]
 * @property {import('ajv').Schema | string} [header]
 * @property {import('ajv').Schema | string} [body]
 * @property {import('ajv').Schema | string} [query]
 */
/**
 * @typedef {Object} NSValidator.Options
 * @property {string} name
 * @property {string} version
 * @property {boolean} debug
 * @property {Logger} [logger]
 * @property {import('ajv').AnySchema[]} [schema]
 */
/**
 * @callback NSValidator.validate_middle
 * @param {import('express').Request} request
 * @param {import('express').Response} response
 * @param {import('express').NextFunction} next
 */
/**
 * @class
 */
module.exports = class Validator {
  name = "";
  version = "";
  /**
   * @type {Ajv}
   */
  ajv;
  /**
   * @type {Logger}
   */
  logger;
  /**
   * @type {Interchange}
   */
  interchange;
  /**
   * @type {NSValidator.Options}
   */
  opts;
  /**
   * @param {NSValidator.Options} opts
   */
  constructor(opts) {
    this.opts = opts;
    this.ajv = new Ajv({
      verbose: opts.debug,
      allErrors: true,
      schemas: opts.schema,
    });
    AjvErrors(this.ajv);
    if (this.opts.logger) {
      this.logger = this.opts.logger;
    } else {
      this.logger = new Logger({
        context: `validator:${this.opts.name}:v${this.opts.version}`,
      });
    }
    this.interchange = new Interchange({
      name: this.opts.name,
      version: this.opts.version,
      debug: this.opts.debug,
    });
    this.logger.info("init validator");
  }
  /**
   * @param {NSValidator.Schema} schema
   * @param {object} message
   * @param {object} [opts]
   * @return {NSValidator.validate_middle}
   */
  validate(schema, message, opts) {
    /**
     * @type {{validator: Function, key: string}[]}
     */
    const validates = [];
    for (const key of ["params", "body"]) {
      if (schema[key]) {
        let validator;
        if (typeof schema[key] == "string") {
          validator = this.ajv.getSchema(schema[key]);
        } else {
          validator = this.ajv.compile(schema.body);
        }
        validates.push({
          validator,
          key,
        });
      }
    }
    return (request, response, next) => {
      /**
       * @type {{key: string, valid: boolean}[]}
       */
      const valids = [];
      for (const validate of validates) {
        const valid = validate.validator(request[validate.key]);
        if (!valid) {
          return next(
            this.interchange.error(400, undefined, {
              cause: validate.validator["errors"],
            })
          );
        } else {
          valids.push({
            key: validate.key,
            valid,
          });
        }
      }
      next();
    };
  }
};
