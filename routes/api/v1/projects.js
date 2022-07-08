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

const api_name = "projects";
const api_version = "1";
const root = process.env.PWD;
const schema = require("#schema/v1/projects");

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
   * @type {App.Models.CtorProjects}
   */
  const Model = db.model(api_name);
  /**
   * @type {typeof App.Models.Users}
   */
  const Model_Users = db.model("users");
  /**
   * @type {App.Models.CtorTasks}
   */
  const Model_Tasks = db.model("tasks");

  await fs.promises.mkdir(path.join(root, "storage/images"), {
    recursive: true,
  });

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
    .get(
      authz.rbac_auth(async function (req, res, nx) {
        return {
          role: req[authc.s.auth_info].role,
          resource: api_name,
          action: "read",
          number: "all",
        };
      }),
      async function (req, res, nx) {
        interchange.success(res, 200, await Model.findAll());
      }
    )
    .post(
      authz.rbac_auth(async function (req, res, nx) {
        return {
          role: req[authc.s.auth_info].role,
          resource: api_name,
          action: "write",
          number: "one",
        };
      }),
      validator.validate({ body: "projects.json#/definitions/create" }),
      async function (req, res, nx) {
        try {
          const project = await Model.create(req.body);

          interchange.success(res, 201);
        } catch (error) {
          nx(interchange.error(500, error));
        }
      }
    );
  router
    .route("/:id")
    .patch(
      authz.rbac_auth(async function (req, res, nx) {
        return {
          role: req[authc.s.auth_info].role,
          resource: api_name,
          action: "write",
          number: "one",
        };
      }),
      validator.validate({ body: "projects.json#/definitions/update" }),
      async function (req, res, nx) {
        try {
          const {
            body,
            params: { id },
          } = req;
          const model = await Model.findOne({ where: { id } });

          const project = model.toJSON();
          const image = project.image.replace("resources", "storage");
          const f_path = path.join(root, image);

          await fs.promises
            .access(f_path, fs.constants.F_OK)
            .then(() => fs.promises.rm(f_path))
            .catch((err) => {});
          await model.update(body);

          interchange.success(res, 200, "updated");
        } catch (error) {
          nx(interchange.error(500, error));
        }
      }
    )
    .delete(
      authz.rbac_auth(async function (req, res, nx) {
        return {
          role: req[authc.s.auth_info].role,
          resource: api_name,
          action: "write",
          number: "one",
        };
      }),
      async function (req, res, nx) {
        try {
          const {
            params: { id },
          } = req;
          const model = await Model.findOne({ where: { id } });
          const project = model.toJSON();
          const image = project.image.replace("resources", "storage");
          const f_path = path.join(root, image);

          await fs.promises
            .access(f_path, fs.constants.F_OK)
            .then(() => fs.promises.rm(f_path))
            .catch((err) => {});
          await model.destroy();

          interchange.success(res, 200, "deleted");
        } catch (error) {
          nx(interchange.error(500, error));
        }
      }
    );

  router.get(
    "/name/:name",
    authz.rbac_auth(async function (req, res, nx) {
      return {
        role: req[authc.s.auth_info].role,
        resource: api_name,
        action: "read",
        number: "one",
      };
    }),
    async function (req, res, nx) {
      try {
        const project = await Model.findOne({
          where: { name: req.params.name },
          include: {
            model: Model_Tasks,
            attributes: { exclude: ["createdAt", "updatedAt"] },
          },
          attributes: { exclude: ["createdAt", "updatedAt"] },
        });
        interchange.success(res, 200, project);
      } catch (error) {
        nx(interchange.error(500, error));
      }
    }
  );
  router.route("/image").post(function (req, res, nx) {
    if (!req.is("image/*")) {
      return nx(interchange.error(406));
    }
    const filename = `${Date.now()}.${req.get("content-type").substring(6)}`;
    const file_path = path.join(root, "storage/images", filename);
    const stream = fs.createWriteStream(file_path);

    req.pipe(stream);

    stream.once("error", (error) => {
      nx(interchange.error(500, error));
    });
    stream.once("finish", () => {
      interchange.success(res, 201, path.join("/resources/images", filename));
    });
  });

  logger.profile(`api ${api_name}`);

  return router;
};
