// pm2 config, matching the convention used for the other apps on wbsnj
// (stage.bioarolabs.com, stage.vautra.com): point pm2 straight at the
// script instead of npm, and use .cjs because this project is
// "type": "module".
module.exports = {
  apps: [
    {
      name: 'antisocialtalks-pod-api',
      script: './server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
