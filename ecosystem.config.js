module.exports = {
  apps: [{
    name: 'galerra-server',
    script: 'build/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 2567,
      MONITOR_USERNAME: 'admin',
      MONITOR_PASSWORD: 'YOUR_SECURE_PASSWORD_HERE'
    },
    env_production: {
      NODE_ENV: 'production',
      MONITOR_USERNAME: 'admin',
      MONITOR_PASSWORD: 'YOUR_SECURE_PASSWORD_HERE'
    }
  }]
};
