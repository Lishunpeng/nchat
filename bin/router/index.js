const {express, app} = require('./base.js')
const {jwtEnc, jwtDec} = require('../jwt');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const proxy = require('http-proxy-middleware');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cors = require('cors')
const routerRoom = require('./routerRoom')
const routerUser = require('./routerUser')

// 支持跨域
app.use(cors())

// body和cookie中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());


// Token认证中间件
app.use((req, res, next) => {
  // token认证白名单
  const whiteList = ['/api/user/register', '/api/user/login', '/api/user/logout', '/favicon.ico']
  const robotWhiteList = ['/api/robot']
  const originalUrl = req.originalUrl
  if (whiteList.indexOf(originalUrl) !== -1  || originalUrl.indexOf(robotWhiteList[0]) !== -1) {
    next()
  }
  else if (req.query.token) {
    const token = req.query.token
    jwtDec(token).then((tokenObjUser) => {
      next();
    })
    .catch((err) => {
      res.json({msgCode: 500,msgCtx: err})
    })
  }
  else {
    res.json({msgCode: 401,msgCtx: 'Please request with token.'})
  }
});

// POST中间件
app.post((req, res, next) => {
  if (!req.body) {
    res.send({
      msgCode:304,
      msgCtx: 'Please enter user info.',
    })
  }
  else {
    next()
  }
});

// 启用路由
app.use(routerRoom)
app.use(routerUser)

// 支持跨域访问聊天机器人
app.use('/api/robot', proxy({
  target: 'http://www.tuling123.com',
  changeOrigin: true
}));

module.exports = app