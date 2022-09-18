const os = require("os");
const fs = require("fs");
const path = require("path");
const Logger = require("./logger");
const chalk = require("chalk");
const winston = require("winston");

function get_time(date) {
  return `${tza(date.getHours())}:${tza(date.getMinutes())}:${tza(
    date.getSeconds()
  )}`;
}
function get_date(date) {
  return `${tza(date.getDate())}/${tza(date.getMonth() + 1)}/${tza(
    date.getFullYear()
  )}`;
}
function get_datetime(date) {
  return `${get_date(date)}.${get_time(date)}`;
}
function tza(value) {
  if (value < 10) return "0" + value;
  return value + "";
}
function dir_datetime(root, today) {
  const d_y = path.join(root, tza(today.getFullYear()));
  const d_m = path.join(d_y, tza(today.getMonth() + 1));
  const d_d = path.join(d_m, tza(today.getDate()));
  fs.mkdirSync(d_y, {
    recursive: true,
  });
  fs.mkdirSync(d_m, {
    recursive: true,
  });
  fs.mkdirSync(d_d, {
    recursive: true,
  });
  return d_d;
}

class ActivityManager {
  /**
   * @type {App.Lib.Activity.Manager.Options}
   */
  opts;
  dir = "";
  /**
   * @param {App.Lib.Activity.Manager.Options} opts
   */
  constructor(opts) {
    this.opts = opts;
    this.dir = path.join(this.opts.dir, "activity");
  }
  /**
   * @param {string} resource
   */
  #today(resource) {
    const today = new Date();
    const file = path.join(tza(today.getDate()), resource + ".log");
    const d_y = path.join(this.dir, tza(today.getFullYear()));
    const d_m = path.join(d_y, tza(today.getMonth() + 1));
    return path.join(d_m, file);
  }
  /**
   * @param {string} resource
   * @param {Date} start
   * @param {Date} end
   */
  async #calc_range_log(resource, start, end) {
    // console.log("[range]", get_date(start), get_date(end));
    const root = this.dir;
    const s_y = start.getFullYear();
    const s_m = start.getMonth() + 1;
    const s_d = start.getDate();
    const e_y = end.getFullYear();
    const e_m = end.getMonth() + 1;
    const e_d = end.getDate();
    const s_t = new Date(`${s_y}/${s_m}/${s_d}`);
    const e_t = new Date(`${e_y}/${e_m}/${e_d}`);
    const list = [];
    for (const y_dir of await fs.promises.readdir(path.join(root))) {
      if (s_y <= +y_dir && +y_dir <= e_y) {
        for (const m_dir of await fs.promises.readdir(path.join(root, y_dir))) {
          const t_dir = new Date(`${y_dir}/${m_dir}/01`);
          s_t.setDate(1);
          if (s_t <= t_dir && t_dir <= e_t) {
            for (const d_dir of await fs.promises.readdir(
              path.join(root, y_dir, m_dir)
            )) {
              const t_dir = new Date(`${y_dir}/${m_dir}/${d_dir}`);
              s_t.setDate(s_d);
              if (s_t <= t_dir && t_dir <= e_t) {
                const dest = path.join(
                  root,
                  y_dir,
                  m_dir,
                  d_dir,
                  resource + ".log"
                );
                const stat = await fs.promises.stat(dest);
                if (stat.isFile()) {
                  list.push(dest);
                }
              }
            }
          }
        }
      }
    }
    // console.log("[range]", list);
    return list;
  }
  /**
   * @param {App.Lib.Activity.Manager.StreamRangeOptions} opts
   * @param {App.Lib.Activity.Manager.HandleStream} handle
   */
  async stream_range(opts, handle) {
    const temp_dir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "stream_range_")
    );
    const temp_path = path.join(temp_dir, ".txt");
    const temp = fs.createWriteStream(temp_path);
    const today = this.#today(opts.resource);
    /**
     * @type {fs.FSWatcher}
     */
    let watcher;
    let size;
    for (const file of await this.#calc_range_log(
      opts.resource,
      opts.start,
      opts.end
    )) {
      fs.createReadStream(file, {}).pipe(temp);
    }
    temp.once("close", async () => {
      temp.destroy();
      fs.createReadStream(temp_path)
        .on("data", (chunk) => {
          handle(chunk + "");
        })
        .once("end", async () => {
          fs.promises.rm(temp_dir, { recursive: true });
          const stat = await fs.promises.stat(today);
          size = stat.size;
          watcher = fs.watch(today, {}, handle_watch);
        });
    });

    /**
     * @param {fs.WatchEventType} event
     * @param {string} filename
     */
    function handle_watch(event, filename) {
      if (event == "change") {
        fs.createReadStream(today, { start: size }).on("data", (chunk) => {
          handle(chunk + "");
          size += chunk.length;
        });
      } else {
        watcher.close();
      }
    }
    return function unwatch() {
      watcher?.close();
    };
  }
  /**
   * @param {App.Lib.Activity.Manager.StreamOptions} opts
   * @param {App.Lib.Activity.Manager.HandleStream} handle
   */
  stream_day(opts, handle) {
    const file = path.join(tza(opts.day), opts.resource + ".log");
    const today = new Date();
    const d_y = path.join(this.dir, tza(today.getFullYear()));
    const d_m = path.join(d_y, tza(today.getMonth() + 1));
    const dest = path.join(d_m, file);
    let size = 0;
    /**
     * @type {fs.FSWatcher}
     */
    let watcher;
    try {
      fs.createReadStream(dest, { start: 0 }).on("data", (chunk) => {
        handle(chunk + "");
        size += chunk.length;
      });
      watcher = fs.watch(dest, {}, handle_watch);
    } catch (error) {
      console.error(error);
    }
    /**
     * @param {fs.WatchEventType} event
     * @param {string} filename
     */
    function handle_watch(event, filename) {
      if (event == "change") {
        fs.createReadStream(dest, { start: size }).on("data", (chunk) => {
          handle(chunk + "");
          size += chunk.length;
        });
      } else {
        watcher.close();
      }
    }
    return function unwatch() {
      watcher.close();
    };
  }
}

module.exports = class Activity {
  static Manager = ActivityManager;
  /**
   * @type {App.Lib.Activity.Options}
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
   * @type {winston.Logger}
   */
  #user_logger;
  /**
   * @param {App.Lib.Activity.Options} opts
   */
  constructor(opts) {
    this.opts = opts;
    const app = opts.app;
    if (!opts.logger) {
      this.logger = new Logger({
        context: `activity:${opts.name}:v${opts.version}`,
      });
    } else {
      this.logger = opts.logger;
    }
    const logger = this.logger;
    const root = path.join(opts.dir, "activity");
    const file_name = path.join(opts.resource + ".log");
    this.#logger = winston.createLogger({
      levels: winston.config.npm.levels,
      exitOnError: false,
      // handleExceptions: true,
      // handleRejections: true,
      defaultMeta: {},
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.printf(({ level, message }) => {
              const time = message.datetime.slice(11);
              const stack = chalk.underline(message.stack);
              const state =
                message.state == "success"
                  ? chalk.green(message.state.toUpperCase())
                  : chalk.red(message.state.toUpperCase());
              const tag = chalk.cyan(message.tag);
              const resource = chalk.yellow(message.resource);
              const auth = chalk.magenta(message.auth);
              return `[${tag}] #${resource} @${auth} ${state} ${time} ${stack}`;
            })
          ),
        }),
      ],
      // exceptionHandlers: [],
      // rejectionHandlers: [],
    });
    const _logger = this.#logger;
    let file_transport = create_file_transport();
    this.#logger.add(file_transport);
    let rotation_daily_started = false;
    create_rotation_daily();
    function create_rotation_daily() {
      let id;
      app.once("close", () => {
        clearTimeout(id);
      });
      if (!rotation_daily_started) {
        const today = new Date();
        const hour_ms = (23 - today.getHours()) * 3.6e6;
        const minute_ms = (60 - today.getMinutes()) * 6e4;
        const timeout_ms = hour_ms + minute_ms;
        logger.info(
          `[activity:rotation] create hourly rotation - time left ${
            23 - today.getHours()
          }:${60 - today.getMinutes()} hour`
        );
        id = setTimeout(() => {
          rotation_daily_started = true;
          logger.info(
            `[activity:rotation] create hourly rotation timeout - time start ${today.getHours()}:${today.getMinutes()} hour`
          );
          create();
          create_rotation_daily();
        }, timeout_ms);
      } else {
        logger.info(`[activity:rotation] create daily rotation`);
        id = setTimeout(() => {
          logger.info(`[activity:rotation] create daily rotation timeout`);
          create();
          create_rotation_daily();
        }, 24 * 3.6e6);
      }
      function create() {
        _logger.remove(file_transport);
        if (!file_transport.destroyed) {
          file_transport.destroy();
        }
        file_transport = create_file_transport();
        _logger.add(file_transport);
      }
      return;
    }
    function create_file_transport() {
      const today = new Date();
      const dir = dir_datetime(root, today);
      const dest = path.join(dir, file_name);
      logger.info(`[activity:rotation] create file transport ${dest}`);
      return new winston.transports.File({
        filename: dest,
        format: winston.format.combine(
          winston.format.printf(({ level, message }) => {
            const time = message.datetime;
            const stack = chalk.underline(message.stack);
            const state =
              message.state == "success"
                ? chalk.green(message.state.toUpperCase())
                : chalk.red(message.state.toUpperCase());
            const tag = chalk.cyan(message.tag);
            const resource = chalk.yellow(message.resource);
            const auth = chalk.magenta(message.auth);
            const data = JSON.stringify(message.data);
            return `[${tag}] #${resource} @${auth} ${state} ${time} ${stack} - ${data}`;
          })
        ),
      });
    }
  }
  /**
   * @param {App.Lib.Activity.MessageInternal['tag']} tag
   * @param {App.Lib.Activity.Message} msg
   * @returns {App.Lib.Activity.MessageInternal}
   */
  #convert_message(tag, msg) {
    const e_stack = new Error().stack
      .split("\n")
      .map((item) => item.trim())[3]
      .split(" ")
      .reverse()[0]
      .replace(/[\(\)]/g, "");
    const stack = e_stack.replace(path.join(process.env.PWD) + "/", "");
    return {
      ...msg,
      datetime: get_datetime(new Date()),
      stack,
      resource: this.opts.resource,
      tag: tag.toUpperCase(),
    };
  }
  /**
   * @param {App.Lib.Activity.MessageLog} msg
   */
  log(msg) {
    this.#logger.info(this.#convert_message(msg.tag, msg));
    return this;
  }
  /**
   * @param {App.Lib.Activity.Message} msg
   */
  create(msg) {
    this.#logger.info(this.#convert_message("create", msg));
    return this;
  }
  /**
   * @param {App.Lib.Activity.Message} msg
   */
  read(msg) {
    const error = new Error();
    this.#logger.info(this.#convert_message("read", msg));
    return this;
  }
  /**
   * @param {App.Lib.Activity.Message} msg
   */
  update(msg) {
    this.#logger.info(this.#convert_message("update", msg));
    return this;
  }
  /**
   * @param {App.Lib.Activity.Message} msg
   */
  restore(msg) {
    this.#logger.info(this.#convert_message("restore", msg));
    return this;
  }
  /**
   * @param {App.Lib.Activity.Message} msg
   */
  delete(msg) {
    this.#logger.info(this.#convert_message("delete", msg));
    return this;
  }
};
