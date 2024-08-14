const querystring = require('querystring');
const CONTENT_TYPES = {
  'FORM_URLENCODED': 'application/x-www-form-urlencoded',
  'TEXT': 'text/plain',
  'JSON': 'application/json',
  'FILE': 'multipart/form-data'
};

module.exports = function bodyParser() {
  return async function(req) {
    const contentType = req.headers['content-type'] || CONTENT_TYPES.FORM_URLENCODED;

    function parseData(data, resolve) {
      switch(contentType) {
        case CONTENT_TYPES.FORM_URLENCODED:
          data = JSON.stringify(querystring.parse(data.toString(), '&', '='));
        break;
        case CONTENT_TYPES.TEXT:
          data = data.toString();
        break;
        case CONTENT_TYPES.JSON:
          data = JSON.stringify(data.toString());
        break;
        default:

        break;
      }

      resolve(data);
    }

    req.body = await new Promise((resolve, reject) => {
      let data = [];
      req.on('data', chunk => {
        data.push(chunk);
      });

      req.on('end', () => {
        parseData(Buffer.concat(data), resolve);
      })
    });
  }
}