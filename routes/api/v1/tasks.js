const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Logger = require("#lib/logger");
const Database = require("#lib/database");
const Authentication = require("#lib/authentication");
const Authorization = require("#lib/authorization");
const Validator = require("#lib/validator");
const Interchange = require("#lib/interchange");

const api_name = "tasks";
const api_version = "1";
const root = process.env.PWD;
const schema = require("#schema/v1/tasks");

/**
 * @param {import('express').Application} app
 */
module.exports = async function (app) {
  const logger = new Logger({ context: `api:${api_name}:v${api_version}` });

  logger.profile(`api ${api_name}`);

  const db = Database.inject("app");
  const interchange = new Interchange({
    name: api_name,
    version: api_version,
    debug: true,
    logger: logger,
  });
  const validator = new Validator({
    name: api_name,
    version: api_version,
    debug: true,
    logger: logger,
    schema: [schema],
  });
  const authc = await new Authentication({
    name: api_name,
    version: api_version,
    description: "",
    debug: true,
    logger: logger,
    jwt: { secretKey: "secret" },
  }).init();
  const authz = await new Authorization({
    name: api_name,
    version: api_version,
    description: "",
    debug: true,
    logger: logger,
    rbac: {
      p_conf: path.join(root, "config/rbac-ext.conf"),
      p_data: path.join(root, "data/rbac-ext.csv"),
    },
  }).init();
  /**
   * @type {App.Models.CtorTasks}
   */
  const Model = db.model(api_name);
  /**
   * @type {typeof App.Models.Users}
   */
  const Model_Users = db.model("users");

  router.use(
    "/",
    authc.jwt_auth(
      async function (req, res, nx) {
        return {
          issuer: "member",
        };
      },
      async function (payload, req, res, nx) {
        const { sub: id } = payload;
        const member = await Model_Users.findOne({ where: { id } });
        if (!member) {
          nx(interchange.error(401, "user not exists"));
        }
        return member.toJSON();
      }
    )
  );
  router
    .route("/")
    .get(function (req, res, nx) {})
    .post(
      authz.rbac_auth(async function (req, res, nx) {
        return {
          role: req[authc.s.auth_info].role,
          resource: api_name,
          action: "write",
          number: "one",
        };
      }),
      validator.validate({ body: "tasks.json#/definitions/create" }),
      async function (req, res, nx) {
        try {
          const task = await Model.create(req.body);

          interchange.success(res, 201, task);
        } catch (error) {
          nx(error);
        }
      }
    )
    .patch(
      authz.rbac_auth(async function (req, res, nx) {
        return {
          role: req[authc.s.auth_info].role,
          resource: api_name,
          action: "write",
          number: "all",
        };
      }),
      validator.validate({ body: "tasks.json#/definitions/update_many" }),
      async function (req, res, nx) {
        const promise_tr = db.transaction();
        try {
          const transaction = await promise_tr;
          const jobs = [];
          for (const task of req.body) {
            const id = task.id;
            delete task.id;
            jobs.push(Model.update(task, { where: { id }, transaction }));
          }
          await Promise.all(jobs);
          await transaction.commit();

          interchange.success(res, 200);
        } catch (error) {
          const transaction = await promise_tr;
          await transaction.rollback();
          nx(error);
        }
      }
    );

  logger.profile(`api ${api_name}`);

  return router;
};
