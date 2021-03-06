module.exports = {
  apps: [
    {
      name: "app",
      script: "bin/www",
      args: "",
      cwd: ".",
      watch: ".",
      ignore_watch: ["[/\\]./", "node_modules", "public", "data"],
      exec_mode: "cluster",
      error_file: "log/pm2",
      out_file: "log/pm2",
      wait_ready: true,
      env_production: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      },
    },
  ],

  deploy: {
    production: {
      user: "SSH_USERNAME",
      host: "SSH_HOSTMACHINE",
      ref: "origin/master",
      repo: "GIT_REPOSITORY",
      path: "DESTINATION_PATH",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
