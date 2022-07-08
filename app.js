const express = require("express");
const session = require("express-session");
const createError = require("http-errors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const loggerHttp = require("morgan");
const rfs = require("rotating-file-stream");
const path = require("path");

const Logger = require("#root/lib/logger");
const Database = require("#lib/database");
const Interchange = require("#root/lib/interchange");
const limitter = require("#root/lib/limitter");

const app = express();
const { env } = process;

const model_users = require("#model/users");
const model_projects = require("#model/projects");
const model_tasks = require("#model/tasks");

// const routesApiV0Account = require("#routes/api/v0/account");
const routes_api_v1_members = require("#routes/api/v1/members");
const routes_api_v1_projects = require("#routes/api/v1/projects");
const routes_api_v1_tasks = require("#routes/api/v1/tasks");
// const routesLangEnAccount = require("#routes/lang/en/account");

loggerHttp.token("protocol", function (req, res) {
  // @ts-ignore
  return req.protocol;
});
loggerHttp.token("status-code", function (req, res) {
  return res.statusMessage;
});

async function init() {
  const logger = await new Logger({
    context: "app:v1",
  }).default();
  const db = new Database({
    name: "app",
    url: env.DB_URL,
    model_loaders: [model_users, model_projects, model_tasks],
    logger: logger,
  });

  await db.init();

  app.on("close", async function () {
    await db.close();
  });

  app.disable("x-powered-by");
  app.set("trust proxy", env.BEHIND_PROXY ? 1 : false);
  app.set("views", path.join(__dirname, "views"));
  app.set("view engine", "ejs");

  app.use(limitter);
  app.use(
    loggerHttp(env.LOG_STDOUT ? "dev" : env.LOG_FORMAT, {
      stream: env.LOG_STDOUT
        ? process.stdout
        : rfs.createStream(env.LOG_FILE, {
            interval: "1d",
            path: path.join(__dirname, env.LOG_DIR),
          }),
    })
  );
  // app.use(express.json());
  // app.use(express.urlencoded({ extended: false }));
  // app.use(cookieParser());
  // app.use(
  //   session({
  //     secret: crypto.randomBytes(48).toString("hex"),
  //     name: "sessionId",
  //     resave: true,
  //     saveUninitialized: true,
  //   })
  // );
  // app.use(helmet);
  app.use("/public", express.static(path.join(__dirname, "public")));
  app.use("/resources", express.static(path.join(__dirname, "storage")));

  app.use("/api/v1", express.json(), express.urlencoded({ extended: true }));
  app.use("/api/v1/members", await routes_api_v1_members(app));
  app.use("/api/v1/projects", await routes_api_v1_projects(app));
  app.use("/api/v1/tasks", await routes_api_v1_tasks(app));
  app.use(
    "/api/v1/",
    Interchange.not_found_middle(),
    Interchange.error_middle()
  );

  // app.use(function (req, res, next) {
  //   next(new createError.NotFound());
  // });

  // app.use(function (err, req, res, next) {
  //   console.log("cause", err.cause);
  //   console.log("expose", err.expose);
  //   console.log("headers", err.headers);
  //   console.log("message", err.message);
  //   console.log("name", err.name);
  //   console.log("stack", err.stack);
  //   console.log("status", err.status);
  //   console.log("statusCode", err.statusCode);

  //   res.locals.message = err.message;
  //   res.locals.error = req.app.get("env") === "development" ? err : {};

  //   res.status(err.status || 500);
  //   res.render("error");
  // });

  return app;
}

module.exports = init;
module.exports.app = app;
