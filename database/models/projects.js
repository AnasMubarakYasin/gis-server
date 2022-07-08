"use strict";
const { Model } = require("sequelize");
module.exports = (
  /** @type {import('sequelize').Sequelize} */ sequelize,
  /** @type {import('sequelize').DataTypes} */ DataTypes
) => {
  class Projects extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     * @param {Object<string, import('sequelize').ModelStatic<Model>>} models
     */
    static associate(models) {
      // define association here
      this.hasMany(models.tasks, {
        foreignKey: {
          name: "id_projects",
          allowNull: false,
        },
      });
    }
  }
  Projects.init(
    {
      image: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name_company: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      contract_number: {
        type: DataTypes.SMALLINT,
        allowNull: false,
      },
      contract_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      activity: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      obstacles: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      progress: {
        type: DataTypes.SMALLINT,
        allowNull: false,
      },
      fund_source: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fiscal_year: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "projects",
      underscored: true,
    }
  );
  return Projects;
};
