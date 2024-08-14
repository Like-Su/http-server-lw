module.exports = {
  server: {
    port: 8080,
    compress: true,
    cache: true,
    cacheTime: 3600,
    reload: true, // 当出现错误时是否尝试重新启动服务器
    robots: true,
    validReference: [],
    ruleReference: /\.(jpe?g|png|gif)$/,
    referenceErrorMessage: 'error',
    onListener(status) { // 启动后触发
      // console.log(status);
    },
    onError(error) { // 启动错误后触发
      // console.log(error);
    },
    mock: './mock',
  }
}