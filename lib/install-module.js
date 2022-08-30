const fs = require("fs");
const chalk = require("chalk");
const c_orange = chalk.hex("#ffa500");

Promise.resolve()
  .then(() => {
    console.log(chalk.blue("(*)"), c_orange("[env] generate .env"));
  })
  .then(() => {
    console.log(chalk.blue("(*)"), c_orange("[env] check .env"));
    return fs.promises.access(".env", fs.constants.W_OK)
  })
  .then(() => {
    console.log(
      chalk.red("(*)"),
      c_orange("[env] .env already exists")
    );
  })
  .catch(() => {
    console.log(chalk.blue("(*)"), c_orange("[env] copy .env.example to .env"));
    return fs.promises.copyFile(".env.example", ".env")
      .then(() => {
        console.log(chalk.green("(*)"), c_orange("[env] copy .env.example success"));
      })
      .catch((error) => {
        console.log(
          chalk.red("(*)"),
          new Error("[env] copy .env.example error", { cause: error })
        );
      })
  })
