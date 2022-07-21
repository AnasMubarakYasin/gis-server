import { Model, ModelStatic, Optional } from "sequelize";
import { SchemaProjects } from "../type/v1/projects";
import { SchemaTasks } from "../type/v1/tasks";
import { SchemaAdmins } from "../type/v1/admins";
import { SchemaSupervisors } from "../type/v1/supervisors";

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
      type UsersAttributes = {
        id: number;
        name: string;
        email: string;
        role: string;
        password: string;
      };

      type UserCreationAttributes = Optional<UsersAttributes, "id">;

      class Users extends Model<UsersAttributes, UserCreationAttributes> {}
      class Projects extends Model<
        SchemaProjects,
        Optional<SchemaProjects, AttrDef>
      > {}
      class Tasks extends Model<SchemaTasks, Optional<SchemaTasks, AttrDef>> {}
      class Admins extends Model<SchemaAdmins, Optional<SchemaAdmins, AttrDef>> {}
      class Supervisors extends Model<SchemaSupervisors, Optional<SchemaSupervisors, AttrDef>> {}

      type CtorProjects = ModelStatic<Projects>;
      type CtorTasks = ModelStatic<Tasks>;
      type CtorAdmins = ModelStatic<Admins>;
      type CtorSupervisors = ModelStatic<Supervisors>;
    }
  }
}
