module.exports = {
  server: {
    port: 8080, // server port
    compress: true, // compress enabled?
    cache: true, // cache enabled?
    cacheTime: 3600, // cache time
    reload: true, // Failed to restart
    robots: true, // robots.txt
    validReference: [], // whitelist
    ruleReference: /\.(jpe?g|png|gif)$/, //Anti-hotlinking rules
    referenceErrorMessage: 'error', // Anti-hotlinking message
    onListener(status) {}, // server start
    onError(error) {}, // server startup failed
    mock: './mock', // mock data
  }
}