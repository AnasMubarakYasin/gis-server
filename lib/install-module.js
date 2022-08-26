const fs = require("fs");
const chalk = require("chalk");
const c_orange = chalk.hex("#ffa500");

Promise.resolve()
  .then(() => {
    console.log(chalk.blue("(*)"), c_orange("copy .env.example to .env"));
    return fs.promises.copyFile(".env.example", ".env");
  })
  .then(() => {
    console.log(chalk.green("(*)"), c_orange("success copy .env.example "));
  })
  .catch((error) => {
    console.log(
      chalk.red("(*)"),
      new Error("failed copy .env.example", { cause: error })
    );
  })
  .finally(() => {
    return 
  });
