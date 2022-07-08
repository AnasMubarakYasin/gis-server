"use strict";
const { Model } = require("sequelize");
module.exports = (
  /** @type {import('sequelize').Sequelize} */ sequelize,
  /** @type {import('sequelize').DataTypes} */ DataTypes
) => {
  class Tasks extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     * @param {Object<string, import('sequelize').ModelStatic<Model>>} models
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.projects, {
        foreignKey: {
          name: "id_projects",
          allowNull: false,
        },
      });
    }
  }
  Tasks.init(
    {
      // id_projects: {
      //   type: DataTypes.INTEGER,
      //   allowNull: false,
      //   references: { model: "projects", key: "id" },
      // },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT("medium"),
        allowNull: false,
      },
      done: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "tasks",
      underscored: true,
    }
  );
  return Tasks;
};
