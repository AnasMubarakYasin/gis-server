"use strict";
const { Model } = require("sequelize");

module.exports = (
  /** @type {import('sequelize').Sequelize} */ sequelize,
  /** @type {import('sequelize').DataTypes} */ DataTypes
) => {
  class Users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Users.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "users",
      underscored: true,
      indexes: [{ unique: true, fields: ["name", "email"] }],
    }
  );
  return Users;
};
