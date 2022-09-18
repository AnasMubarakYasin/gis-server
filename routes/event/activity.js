const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const AnsiToHtml = require("ansi-to-html");
const Logger = require("#lib/logger");
const Database = require("#lib/database");
const Authentication = require("#lib/authentication");
const Authorization = require("#lib/authorization");
const Validator = require("#lib/validator");
const Interchange = require("#lib/interchange");
const Activity = require("#lib/activity");
const middleware_auth_ctor = require("#middleware/auth");
const middleware_sse_ctor = require("#middleware/sse");

const event_name = "activity";
const event_version = "1";
const root = process.env.PWD;
// const schema = require("#schema/v2/index");

/**
 * @param {import('express').Application} app
 */
module.exports = async function (app) {
  const logger = new Logger({
    context: `event:${event_name}:v${event_version}`,
  });

  logger.profile(`event ${event_name}`);

  // const db = Database.inject("app");
  // const interchange = new Interchange({
  //   name: event_name,
  //   version: event_version,
  //   debug: true,
  //   logger: logger,
  // });
  // const validator = new Validator({
  //   name: event_name,
  //   version: event_version,
  //   debug: true,
  //   logger: logger,
  //   schemas: [schema],
  // });
  // const authc = await new Authentication({
  //   name: event_name,
  //   version: event_version,
  //   description: "",
  //   debug: true,
  //   logger: logger,
  //   jwt: { secretKey: "secret" },
  // }).init();
  // const authz = await new Authorization({
  //   name: event_name,
  //   version: event_version,
  //   description: "",
  //   debug: true,
  //   logger: logger,
  //   rbac: {
  //     p_conf: path.join(root, "config/rbac-ext.conf"),
  //     p_data: path.join(root, "data/rbac-ext.csv"),
  //   },
  // }).init();
  // const activity = new Activity({
  //   name: event_name,
  //   version: event_version,
  //   debug: true,
  //   logger: logger,
  //   dir: path.join(process.env.LOG_DIR, event_name),
  //   group: "day",
  //   resource: event_name,
  // });
  const activity_manager = new Activity.Manager({
    dir: process.env.LOG_DIR,
  });
  const middleware_auth = await middleware_auth_ctor(app);
  const middleware_sse = await middleware_sse_ctor(app);
  const ansi = new AnsiToHtml();
  /**
   * @type {App.Models.CtorReports}
   */
  // const Model = db.model(event_name);

  // router.use(middleware_auth.router_authc, middleware_auth.router_authz);
  router.get(
    "/:name",
    middleware_sse.router_authc,
    middleware_sse.intercept,
    async function (req, res, nx) {
      try {
        const resource = req.params.name;
        const start = new Date(+req.query.start);
        const end = new Date(+req.query.end);
        const unwatch = await activity_manager.stream_range(
          { resource, start, end },
          (data) => {
            res.stream_event(ansi.toHtml(data));
          }
        );
        res.stream_ping();
        res.on("close", unwatch);
      } catch (error) {
        nx(error);
      }
    }
  );

  logger.profile(`event ${event_name}`);

  return router;
};
