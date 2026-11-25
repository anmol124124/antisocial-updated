// pm2 config for the AntiSocialTalks Next.js app.
//
// Works unchanged on staging and production: the pm2 app name and working
// directory are both taken from the folder this file sits in. Deployed to
// /var/www/stage.antisocialtalks.com it becomes the pm2 app
// "stage.antisocialtalks.com"; deployed to /var/www/antisocialtalks.com it
// becomes "antisocialtalks.com". That matches the convention already used by
// the other sites on this box.
//
// Start it only AFTER the directory has its final name — during a
// side-by-side swap the folder is briefly called "<domain>-new", and pm2
// would take that as the app name.
//
//   cd /var/www/stage.antisocialtalks.com
//   npm run build
//   pm2 start ecosystem.config.cjs
//   pm2 save
//
// PORT can be overridden from the shell: PORT=3013 pm2 start ecosystem.config.cjs
//
// It points at Next's own binary rather than at `npm start` on purpose —
// pm2 wrapping a package-manager script is the most common way these
// deploys break.

const path = require('path');

const name = path.basename(__dirname);
const port = process.env.PORT || '3012';

module.exports = {
  apps: [
    {
      name,
      script: './node_modules/next/dist/bin/next',
      args: `start -p ${port}`,
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: port,
      },
      // Logs go to pm2's default folder (~/.pm2/logs/<name>-out.log / -error.log).
      time: true,
    },
  ],
};
