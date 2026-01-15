module.exports = {
  apps: [
    {
      name: "burro_dos_concertos_staging",
      script: "dist/bot.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "staging",
        // Environment variables should be set via .env file or PM2 ecosystem
        // BOT_TOKEN, DATABASE_URL, GROUP_ID should be configured separately
      },
      error_file: "logs/staging-error.log",
      out_file: "logs/staging-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
    {
      name: "burro_dos_concertos_production",
      script: "dist/bot.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        // Environment variables should be set via .env file or PM2 ecosystem
        // BOT_TOKEN, DATABASE_URL, GROUP_ID should be configured separately
      },
      error_file: "logs/production-error.log",
      out_file: "logs/production-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
