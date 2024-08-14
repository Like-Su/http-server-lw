const Server = require('./core/Server');


exports.createServer = function(options) {
  const server = new Server(options);

  server.listener();
}