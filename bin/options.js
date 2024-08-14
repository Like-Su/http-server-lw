module.exports = {
  config: {
    option: '-c --config',
    description: 'config file',
    default: 'web.server.js',
  },
  root: {
    option: '-r --root',
    description: 'server start directory',
    default: process.cwd()
  },
  default: {
    option: '-d --default',
    description: 'default server config',
    default: true
  }
};