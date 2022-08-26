import { Model, ModelStatic, Optional } from "sequelize";
import { SchemaProjects } from "../type/v1/projects";
import { SchemaTasks } from "../type/v1/tasks";
import { SchemaAdmins } from "../type/v1/admins";
import { SchemaSupervisors } from "../type/v1/supervisors";

import * as TypeV2 from "../type/v2/index";
import Logger from "#root/lib/logger";

import * as express from "express";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      PWD: string;
      DEBUG: string;
      BEHIND_PROXY: boolean;
      LOG_DIR: string;
      LOG_STDOUT: boolean;
      LOG_FILE: string;
      LOG_FORMAT: string;
      DOMAIN: string;
      PROTOCOL: string;
      HOSTNAME: string;
      PORT: number;
      HOST: string;
      PATH_API: string;
      URL_BS_API: string;
      DB_URL: string;
      SERVER_MODE: string;
      SERVER_HAS_ENV: boolean;
      JWT_KEY: string;
      ROOT_NAME: string;
      ROOT_PASS: string;
    }
  }
  namespace Express {
    interface Application {
      event(
        path: string,
        ...handlers: ((
          request: Express.Request,
          response: Express.Response,
          next: Express.NextFunction
        ) => void)
      ): void;
    }
    interface Response {
      stream_ping(): void;
      stream_event(data: any, event?: string, id?: number): void;
      stream_event_end(data: any, event?: string, id?: number): void;
    }
    interface NextFunction {
      (): void;
      (error: Error): void;
      (name: string): void;
    }
  }
  namespace App {
    module Util {
      type GetReturnType<Type> = Type extends (...args: never[]) => infer Return
        ? Return
        : never;
    }
    module Models {
      type AttrDef = "id" | "createdAt" | "updatedAt";
      type UsersInterop = {
        username: string;
        password: string;
        image: string;
        name: string;
        nip: string;
        role: string;
      };

      class Projects extends Model<
        TypeV2.Projects,
        Optional<TypeV2.ProjectsCreate, AttrDef>
      > {}
      class Reports extends Model<
        TypeV2.Reports,
        Optional<TypeV2.ReportsCreate, AttrDef>
      > {}
      class Admins extends Model<
        TypeV2.Admins,
        Optional<TypeV2.AdminsCreate, AttrDef>
      > {}
      class Supervisors extends Model<
        TypeV2.Supervisors,
        Optional<TypeV2.SupervisorsCreate, AttrDef>
      > {}

      type CtorProjects = ModelStatic<Projects>;
      type CtorReports = ModelStatic<Reports>;
      type CtorAdmins = ModelStatic<Admins>;
      type CtorSupervisors = ModelStatic<Supervisors>;
    }
    module Lib {
      namespace Logger {
        type Instance = Logger;
      }
      namespace SSE {
        interface Options {
          app: express.Application;
          debug: boolean;
          logger?: Lib.Logger.Instance;
          prefix: string;
        }
        type Handler = (
          request: Express.Request,
          response: Express.Response,
          next: Express.NextFunction
        ) => void;
      }
      namespace Activity {
        interface Options {
          name: string;
          version: string;
          debug: boolean;
          logger?: Lib.Logger.Instance;
          group: "year" | "month" | "day";
          dir: string;
          resource: string;
        }
        interface MessageInternal {
          datetime: string;
          tag: string;
          resource: string;
          state: "success" | "error";
          auth: string;
          data: object;
          stack: string;
        }
        interface MessageLog {
          tag: string;
          state: "success" | "error";
          auth: string;
          data: object;
        }
        interface Message {
          state: "success" | "error";
          auth: string;
          data: object;
        }
        namespace Manager {
          interface Options {
            dir: string;
          }
          interface StreamOptions {
            resource: string;
            day: number;
          }
          interface StreamRangeOptions {
            resource: string;
            start: Date;
            end: Date;
          }
          type HandleStream = (data: string) => void;
        }
      }
    }
  }
}
