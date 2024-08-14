const os = require('os');
const http = require('http');
const url = require('url');
const fsp = require('fs/promises');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const chalk = require('chalk');
const mime = require('mime');
const bodyParser = require('./bodyParser');
const debugGet = require('debug')('GET');
const debugPost = require('debug')('POST');
const debugDelete = require('debug')('DELETE');
const debugPut = require('debug')('PUT');

const STATUS_CODE = {
  304: 'CACHE'
}

class Server {
  constructor(options = {}) {
    // 服务启动目录
    this.root = options.cli.root;
    // 端口
    this.port = options.server.port;
    // 压缩方式
    this.compress = options.server.compress;
    // 是否开启缓存
    this.cache = options.server.cache;
    // 缓存时间 s 为单位
    this.cacheTime = options.server.cacheTime;
    // 当服务器启动失败是否重启
    this.reload = options.server.reload;
    // 自动识别扩展名
    this.ext = options.server.ext;
    // 启动成功回调
    this.onListener = options.server.onListener;
    // 启动失败回调
    this.onError = options.server.onError;
    // robots 文件
    this.robots = options.server.robots;
    // mock 数据
    this.mock = options.server.mock;
    // 白名单列表
    this.validReference = options.server.validReference;
    // 防盗链规则
    this.ruleReference = options.server.ruleReference;
    // 防盗链错误消息
    this.referenceErrorMessage = options.server.referenceErrorMessage;
    // 选项集合
    this._options = options;
  }

  // 处理静态服务
  async requestStatic(pathname, req, res) {
    const newPath = path.join(this.root, pathname);

    try {
      // 静态服务
      const stat = await fsp.stat(newPath);

      if (stat.isDirectory()) {
        const dirs = await fsp.readdir(newPath);
        let lks = dirs.map(dir => `<p><a href="${path.join(pathname, dir)}" title="${path.join(newPath, dir)}">${dir}</a></p>`).join('');

        res.end(lks);
      } else {
        if (this.requestReference(pathname, req, res)) {
          return;
        }

        if (this.cache) {
          this.requestCache(pathname, req, res);
        }

        const contentType = mime.getType(newPath) || 'text/plane';

        const compressStream = this.requestCompress(req, res);

        res.setHeader('Content-Type', `${contentType}; charset=utf-8`);

        if (compressStream) {
          return fs.createReadStream(newPath).pipe(compressStream).pipe(res);
        }

        return fs.createReadStream(newPath).pipe(res);
      }

    } catch (e) {
      this.requestError(req.method, e);
    }
  }

  // 处理动态路由
  async requestDynamic(pathname, query, req, res) {
    if (!this.mock) return false;
    try {
      req.query = query;
      await bodyParser()(req);
      const mockPath = path.join(this.root, this.mock, pathname);
      const mockData = (await Promise.resolve(require(mockPath)))(pathname, req, res);
      if (!mockData) return false;

    } catch (e) {
      this.requestError(req.method, e);
    }
    return true;
  }

  requestAti

  // 处理 robots 文件
  async requestRobots(pathname, req, res) {
    try {
      await fsp.access(path.join(this.root, pathname));
      this.requestStatic(pathname, req, res);
    } catch (e) {
      this.requestError(req.method, e);
    }
  }

  // 压缩方法
  requestCompress(req, res) {
    if (!this.compress) return false;

    const encodings = req.headers['accept-encoding'].split(',');
    const compressMethods = { 'gzip': zlib.createGzip, 'br': zlib.createBrotliCompress, 'deflate': zlib.createDeflate };
    const encoding = Object.keys(compressMethods).find(compressMethod => encodings.find(encoding => compressMethod === encoding));

    if (!encoding) return false;

    res.setHeader('content-encoding', encoding);

    return compressMethods[encoding]();
  }

  async requestCache(pathname, req, res) {
    try {
      // 新版本 强制缓存
      res.setHeader('cache-control', `max-age=${this.cacheTime}`);
      const file = await fsp.stat(path.join(this.root, pathname));
      const eTag = `${file.ctime.getTime().toString(16)}/${file.size}`;
      res.setHeader('Etag', eTag);
      const modifier = req.headers['if-none-match'];
      if (modifier === eTag) {
        res.statusCode = 304;
        res.end();
        return true;
      }
    } catch (e) {
      this.requestError(req.method, e);
    }
  }

  // 请求头, 跨域, 缓存, 请求方式 设置
  requestCors(req, res) {
    if (!req.headers.origin) {
     return false;
    }

    // 同意跨域
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    // 允许标头
    res.setHeader('Access-Control-Allow-Headers', 'authorization');
    // 最大缓存时间
    res.setHeader('Access-Control-Max-Age', 1000);
    // 允许方法
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,OPTIONS');

    return req.method === 'OPTIONS' ? (res.end(), true) : false;
  }

  async handleRequest(req, res) {
    let { pathname, query } = url.parse(req.url, true);

    if (this.requestCors(req, res)) {
      return true;
    }

    // robots 文件处理
    const robots = await this.requestRobots(pathname, req, res);

    if (robots) {
      return;
    }

    // 动态请求
    const dynamic = await this.requestDynamic(pathname, query, req, res);

    if (dynamic) {
      return;
    }

    // 静态服务
    this.requestStatic(pathname, req, res);
  }

  // 防盗链设置
  requestReference(filename, req, res) {
    this.ruleReference = Reflect.getPrototypeOf(this.ruleReference)?.constructor === RegExp ? this.ruleReference : new RegExp(this.ruleReference);

    if (this.ruleReference.test(filename)) {
      const referer = req.headers['referer'] || req.headers['referrer'];

      if (!referer) {
        return false;
      }
      const host = `http://${req.headers['host']}`;
      console.log(host);
      const originHost = url.parse(host, true).hostname; // 所有者
      const targetHost = url.parse(referer, true).hostname; // 访问者

      // 当外来 用户访问我的服务器时
      if (originHost !== targetHost) {
        res.end(this.referenceErrorMessage);
        return true;
      }
    }
  }

  // 错误设置
  requestError(method, err) {
    return {
      'GET': debugGet,
      'POST': debugPost,
      'DELETE': debugDelete,
      'PUT': debugPut
    }[method](err);
  }

  // 监听器
  listener(...args) {
    const server = http.createServer(this.handleRequest.bind(this));

    const newListen = () => {
      const interfaces = os.networkInterfaces();

      const netsCallback = inter => {
        const addr = interfaces[inter].find(net => net.family === 'IPv4')?.address || '';

        return `  http://${addr}:${this.port}`;
      };

      const nets = Object.keys(os.networkInterfaces()).map(netsCallback).join('\r\n');
      this.onListener();

      let res = `
http-server settings:
Cache: ${chalk.yellow(this.cacheTime)} seconds
Serve Compress Files: ${chalk.yellow(this.compress)}
Serve Directory: ${chalk.green(this.root)} (CTRL + CLICK to director)
Default File Extension: ${chalk.yellow(this.ext || 'none')}

Available on:
${chalk.yellow(nets)}
Hit CTRL-C to stop the server
      `

      console.log(res);
    }

    server.listen(this.port, newListen, ...args);

    server.on('error', (err) => {
      if (!this.reload) return this.onError(err);
      console.log(chalk.red('reload server...'));
      this.port += 1;
      this.listener(...args);
      this.reload = false;
    });

    return server;
  }
}

module.exports = Server;