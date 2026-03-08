module.exports = {
    apps: [
        {
            name: 'nova-backend',
            script: './server.js',
            cwd: './server',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env_production: {
                NODE_ENV: 'production',
                PORT: 5001
            }
        }
    ]
};
