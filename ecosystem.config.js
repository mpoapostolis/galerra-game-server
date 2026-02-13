module.exports = {
  apps: [{
    name: 'galerra-server',
    script: 'build/index.js',
    instances: 1, // MUST be 1 — Colyseus keeps room state in memory
    exec_mode: 'fork',
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 2567,
      MONITOR_USERNAME: 'admin',
      MONITOR_PASSWORD: process.env.MONITOR_PASSWORD,
    },
  }]
};
