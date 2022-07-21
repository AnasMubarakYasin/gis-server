"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class tasks extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
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
  tasks.init(
    {
      id_projects: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "projects", key: "id" },
      },

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
  return tasks;
};
