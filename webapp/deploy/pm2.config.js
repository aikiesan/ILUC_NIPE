module.exports = {
  apps: [{
    name: 'abiove-webapp',
    script: '.venv/bin/uvicorn',
    interpreter: 'none',
    args: 'backend.main:app --host 127.0.0.1 --port 8001',
    cwd: '/var/www/abiove-webapp',
    env: { ROOT_PATH: '/abiove' },
    restart_delay: 3000,
    max_restarts: 10,
    watch: false,
  }],
};
