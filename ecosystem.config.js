const path = require('path');

module.exports = {
  apps: [
    {
      name: 'meterops',
      script: 'npm',
      args: 'run start:prod',
      cwd: path.resolve(__dirname),
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      error_file: './logs/meterops-error.log',
      out_file: './logs/meterops-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
