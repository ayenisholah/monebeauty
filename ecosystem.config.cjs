module.exports = {
  apps: [
    {
      name: "monebeauty",
      script: "npm",
      args: "run start",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "5000",
      },
    },
    {
      name: "monebeauty-reminders",
      script: "npm",
      args: "run notifications:reminders",
      watch: false,
      autorestart: false,
      cron_restart: "*/30 * * * *",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
