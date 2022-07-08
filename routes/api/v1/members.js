const express = require("express");
const router = express.Router();
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Logger = require("#lib/logger");
const Database = require("#lib/database");
const Authentication = require("#lib/authentication");
const Authorization = require("#lib/authorization");
const Validator = require("#lib/validator");
const Interchange = require("#lib/interchange");

const api_name = "members";
const api_version = "1";
const root = process.env.PWD;
const schema = require("#schema/v1/members");
const { response } = require("express");

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
  });
  const authc = new Authentication({
    name: api_name,
    version: api_version,
    description: "",
    debug: true,
    logger: logger,
    jwt: { secretKey: "secret" },
  });
  const authz = new Authorization({
    name: api_name,
    version: api_version,
    description: "",
    debug: true,
    logger: logger,
    rbac: {
      p_conf: path.join(root, "config/rbac-ext.conf"),
      p_data: path.join(root, "data/rbac-ext.csv"),
    },
  });

  /**
   * @type {typeof App.Models.Users}
   */
  const Model_Users = db.model("users");

  await authc.init();
  await authz.init();

  router.get(
    "/",
    authc.jwt_auth(
      async function (req, res, nx) {
        return {
          issuer: "member",
        };
      },
      async function (payload, req, res, nx) {
        const { sub: id } = payload;
        const member = await Model_Users.findByPk(id);
        if (!member) {
          nx(interchange.error(401, "user not exists"));
        }
        return member.toJSON();
      }
    ),
    authz.rbac_auth(async function (req, res, nx) {
      return {
        role: req[authc.s.auth_info].role,
        resource: api_name,
        action: "read",
        number: "all",
      };
    }),
    async function (request, response, next) {
      const users = await Model_Users.findAll();
      interchange.success(response, 200, users);
    }
  );
  router.post(
    "/",
    authc.jwt_auth(
      async function (req, res, nx) {
        return {
          issuer: "member",
        };
      },
      async function (payload, req, res, nx) {
        const { sub: id } = payload;
        const member = await Model_Users.findByPk(id);
        if (!member) {
          nx(interchange.error(401, "user not exists"));
        }
        return member.toJSON();
      }
    ),
    validator.validate({ body: schema.definitions.create }),
    async function (request, response, next) {
      const { body } = request;
      const member = await Model_Users.findOne({ where: { name: body.name } });
      if (member) {
        interchange.error(400, "data already exist");
      } else {
        await Model_Users.create({
          name: body.name,
          email: body.email,
          role: body.role.toLowerCase(),
          password: body.password,
        });
        interchange.success(response, 200);
      }
    }
  );
  router.patch(
    "/:id",
    validator.validate({
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: schema.definitions.update,
    }),
    async function (request, response, next) {
      const { params, body } = request;
      const member = await Model_Users.findByPk(+params.id);
      const copy = Object.assign({}, member.toJSON());
      if (member) {
        await member.update({
          name: body.name,
          email: body.email,
          role: body.role,
          password: body.password,
        });

        interchange.success(response, 200, copy);
      } else {
        interchange.error(401, "data not exist");
      }
    }
  );
  router.put(
    "/",
    authc.jwt_auth(
      async function (req, res, nx) {
        return {
          issuer: "member",
        };
      },
      async function (payload, req, res, nx) {
        const { sub: id } = payload;
        const member = await Model_Users.findByPk(id);
        if (!member) {
          nx(interchange.error(401, "user not exists"));
        }
        return member.toJSON();
      }
    ),
    validator.validate({ body: schema.definitions.undo }),
    async function (request, response, next) {
      const transaction = await db.transaction();
      try {
        const { body } = request;
        const jobs = [];
        for (const user of body) {
          jobs.push(Model_Users.upsert(user, { transaction }));
        }
        await Promise.all(jobs);
        await transaction.commit();
        interchange.success(response, 200);
      } catch (error) {
        await transaction.rollback();
        next(interchange.error(500, error));
      }
    }
  );
  router.delete(
    "/",
    authc.jwt_auth(
      async function (req, res, nx) {
        return {
          issuer: "member",
        };
      },
      async function (payload, req, res, nx) {
        const { sub: id } = payload;
        const member = await Model_Users.findByPk(id);
        if (!member) {
          nx(interchange.error(401, "user not exists"));
        }
        return member.toJSON();
      }
    ),
    validator.validate({ body: schema.definitions.remove_many }),
    async function (request, response, next) {
      try {
        const { body } = request;
        const users = await Model_Users.findAll({
          where: {
            id: {
              [Database.Op.in]: body,
            },
          },
        });
        const removed = [];
        for (const user of users) {
          removed.push(user.toJSON());
        }
        const result = await Model_Users.destroy({
          where: {
            id: {
              [Database.Op.in]: body,
            },
          },
        });

        interchange.success(response, 200, removed);
      } catch (error) {
        next(interchange.error(500, error));
      }
    }
  );
  router.post(
    "/signin",
    validator.validate({ body: schema.definitions.signin }),
    authc.jwt_gen(async function (request, response, next) {
      try {
        const { body } = request;
        const user = await Model_Users.findOne({ where: { name: body.name } });
        if (!user) {
          throw interchange.error(404, "user not exist");
        }
        const member = user.toJSON();
        if (body.password != member.password) {
          throw interchange.error(401, "username or password wrong");
        }
        request["member"] = member;
        return {
          sub: member.id,
          opt: {
            issuer: "member",
            expiresIn: "30s",
          },
        };
      } catch (error) {
        next(error);
      }
    }),
    function (request, response, next) {
      const token = request[Authentication.Symbol.jwt_token];
      const member = request["member"];
      interchange.success(response, 200, { token, user: member });
    }
  );
  router.get(
    "/auth",
    authc.jwt_auth(
      async function (request, response, next) {
        return {
          issuer: "member",
        };
      },
      async function (payload, request, response, next) {
        const { sub: id } = payload;
        const member = await Model_Users.findByPk(id);
        if (!member) {
          next(interchange.error(401, "user not found"));
        }
        return member.toJSON();
      },
      async function (member, request, response, next) {
        return {
          sub: member.id,
          opt: {
            issuer: "member",
            expiresIn: "30s",
          },
        };
      }
    ),
    async function (request, response, next) {
      try {
        const token = request[Authentication.Symbol.jwt_token];
        const member = request[Authentication.Symbol.auth_info];
        interchange.success(response, 200, { token, user: member });
      } catch (error) {
        next(error);
      }
    }
  );
  router.post(
    "/permission",
    validator.validate({ body: { type: "object" } }),
    async function (request, response, next) {
      try {
        /**
         * @type {{body: Object<string, string[]>}}
         */
        const { body } = request;

        console.log(body);

        logger.profile("enforce");
        const data = {};
        for (const [key, value] of Object.entries(body)) {
          data[key] = await authz.enforce(...value);
        }
        logger.profile("enforce");

        interchange.success(response, 200, data);
      } catch (error) {
        next(error);
      }
    }
  );

  logger.profile(`api ${api_name}`);

  return router;
};
