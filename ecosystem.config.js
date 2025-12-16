module.exports = {
  apps: [{
    name: 'galerra-server',
    script: 'build/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 2567
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
