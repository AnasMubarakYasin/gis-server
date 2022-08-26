// const express = require("express");
// const router = express.Router();
const fs = require("fs");
const path = require("path");
// const crypto = require("crypto");
// const bcrypt = require("bcrypt");
const Logger = require("#lib/logger");
const Database = require("#lib/database");
const Authentication = require("#lib/authentication");
const Authorization = require("#lib/authorization");
const Validator = require("#lib/validator");
const Interchange = require("#lib/interchange");

const middleware_name = "sse";
const middleware_version = "1";
const root = process.env.PWD;
const authc_key = process.env.JWT_KEY;
const debug = process.env.NODE_ENV == "development";
// const schema = require("#schema/v2/auth");
const config = {
  ping: 3e4,
  retry: 6e4,
  id: 1,
  set: new Set(),
  map: new Map(),
  count: 0,
  usr_root: {
    username: process.env.ROOT_NAME,
    password: process.env.ROOT_PASS,
    id: 1,
    image: "",
    name: "root",
    nip: "0000",
    role: "root",
  },
};

/**
 * @param {import('express').Application} app
 */
module.exports = async function (app) {
  const logger = new Logger({
    context: `middleware:${middleware_name}:v${middleware_version}`,
  });

  logger.profile(`middleware ${middleware_name}`);

  const db = Database.inject("app");
  const interchange = new Interchange({
    name: middleware_name,
    version: middleware_version,
    debug,
    logger: logger,
  });
  // const validator = new Validator({
  //   name: middleware_name,
  //   version: middleware_version,
  //   debug,
  //   logger: logger,
  //   schemas: [schema],
  // });
  const authc = new Authentication({
    name: middleware_name,
    version: middleware_version,
    description: "",
    debug,
    logger: logger,
    jwt: { secretKey: authc_key },
  });
  const authz = new Authorization({
    name: middleware_name,
    version: middleware_version,
    description: "",
    debug,
    logger: logger,
    rbac: {
      p_conf: path.join(root, "config/rbac-ext.conf"),
      p_data: path.join(root, "data/rbac-ext.csv"),
    },
  });

  await authc.init();
  await authz.init();

  authc.jwt_extractor = function (req) {
    if (req.query.token) {
      return req.query.token + "";
    } else {
      throw interchange.error(401);
    }
  };
  const router_authc = authc.jwt_auth(
    async function (req, res, nx) {
      return {
        issuer: config.issuer,
      };
    },
    async function (payload, req, res, nx) {
      const { sub: id, role } = payload;
      if (role == config.usr_root.role && id == config.usr_root.id) {
        return config.usr_root;
      }
      const Model = db.model(role + "s");
      if (!Model) {
        nx(interchange.error(401, `model "${role}" not exists`));
      }
      const user = await Model.findOne({ where: { id } });
      if (!user) {
        nx(interchange.error(401, `user "${role}" not exists`));
      }
      return user.toJSON();
    }
  );
  const router_authz = authz.rbac_auth(async function (req, res, nx) {
    const role = req[authc.s.auth_info].role;
    if (role == config.usr_root.role) {
      return;
    }
    if (!/\/api\/v\d\/.*/.test(req.originalUrl)) {
      throw new Error("not supported api", {
        cause: "middleware not in api route",
      });
    }
    let resource = req.originalUrl.replace(/\/api\/v\d\/(\w*)\/?.*/, "$1");
    let action = "x";
    let number = "o";
    switch (req.method) {
      case "GET":
        if (req.route) {
          if (req.route.path != "/:id") {
            number = "a";
          }
        }
        action = "r";
        break;
      case "POST":
      case "PUT":
        action = "c";
        break;
      case "PATCH":
        action = "u";
        break;
      case "DELETE":
        action = "d";
        break;
    }
    if (req.is("json")) {
      if (Array.isArray(req.body)) {
        number = "a";
      }
    }
    return {
      role,
      resource,
      action,
      number,
    };
  });
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} nx
   */
  function intercept(req, res, nx) {
    res.set("Cache-Control", "no-store");
    res.set("Content-Type", "text/event-stream");
    res.set("Content-Encoding", "none");
    res.set("Connection", "keep-alive");
    res.status(200);
    const sse_id = config.id++;
    let message_id = 1;
    logger.info(`sse login #${sse_id} +${++config.count}`);
    res.stream_event = function (data, event = "message", id = null) {
      if (!id) {
        id = message_id++;
      }
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n`);
      res.write(`id: ${id}\n`);
      // res.write(`retry: ${config.retry}\n`);
      res.write("\n");
    };
    res.once("destroying", () => {
      res.destroy();
    });
    res.stream_event_end = function (data, event = "message", id = null) {
      res.once("close", () => {
        res.emit("destroying");
      });
      res.stream_event(data, event, id);
      res.end();
    };
    res.stream_ping = function () {
      const id = setInterval(() => {
        res.stream_event(new Date().toLocaleString(), "ping");
      }, config.ping);
      res.once("destroying", () => {
        clearTimeout(id);
      });
    };
    app.once("close", () => {
      res.stream_event_end("server down", "close");
    });
    res.once("error", (error) => {
      logger.error(error);
      res.stream_event_end("response error", "close");
    });
    res.once("close", () => {
      logger.info(`sse logout #${sse_id} +${--config.count}`);
    });
    nx();
  }

  /**
   * @param {import('express').Router} router
   * @returns {import('express').Router}
   */
  const register = function (router) {
    return router;
  };

  logger.profile(`middleware ${middleware_name}`);

  return {
    config,
    authc,
    authz,
    register,
    intercept,
    router_authc,
    router_authz,
  };
};
