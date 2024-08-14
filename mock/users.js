module.exports = function(pathname, req, res) {
  if(req.method === 'GET' && req.query) {
    res.end(JSON.stringify({
      id: 0,
      username: req.query.username
    }));
  } else if(req.method === 'POST'&& req.body) {
    res.end(req.body);
  }
  return true;
}