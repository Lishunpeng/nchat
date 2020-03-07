const {jwtEnc, jwtDec} = require('../jwt');
const {router} = require('./base')
const {info, user} = require('../database/model')
const crypto = require('crypto')
const md5 = crypto.createHash('md5');

function cryptoPass (user, pass) {
  const uniquePassKey = '2333666'
  const uniqueString = `${user}${uniquePassKey}${pass}`
  return require('crypto').createHash('md5').update(uniqueString).digest('hex');
}

// 用户列表
router.get('/api/user', (req, res, next) => {
  info.find({}, (err, val) => {
    if (val!==null) {
      res.send({
        msgCode:200,
        msgCtx: val,
      })
    }
    else {
      res.send({
        msgCode:404,
        msgCtx: 'Has not any user.',
      })
    }
  })
})

// 用户注册
router.post('/api/user/register', (req, res, next) => {

  user.findOne({
    name: req.body.name,
  }, (err, val) => {

    // 用户已存在则返回已存在信息
    // 数据库操作过程中发生错误则进行相关提示
    // 否则继续执行
    if (err) {
      res.send({
        msgCode:500,
        msgCtx: err,
      })
    }
    else if (val !== null) {
      res.send({
        msgCode:304,
        msgCtx: '注册失败！用户已存在',
      })
    }
    else {
      const defaultUserImg = '/src/image/boysIcon.png'

      // 设置别名
      const name = req.body.name
      const pass = cryptoPass(name, req.body.pass)

      // 保存账号
      userSave = new user({
        name: name,
        pass: pass,
      })
      userSave.save()

      // 保存资料
      infoSava = new info({
        user: name,
        gender: 'secure',
        img: defaultUserImg,
        city: 'beijing',
        hobbies: [],
      })
      infoSava.save()

      // 生成token
      const token = jwtEnc(name, pass)
      res.cookie('token', token, { expires: new Date(Date.now() + 60*60*24*1*1000), httpOnly: true });
      res.send({
        msgCode:200,
        msgCtx: 'Reg success.',
        token: token
      })
    }
  })
});

// 用户登陆
router.post('/api/user/login', (req, res, next) => {

  // 设置别名
  const name = req.body.name
  const pass = cryptoPass(name, req.body.pass)

  // 查询数据库中发生错误或者用户名不存在、密码错误则进行相应的提示
  user.findOne({
    name: name,
  }, (err, val) => {
    if (err) {
      res.send({
        msgCode:500,
        msgCtx: err,
      })
    }
    else if (val === null) {
      res.send({
        msgCode:404,
        msgCtx: '用户不存在！',
      })
    }
    else if(val.pass !== pass) {
      res.send({
        msgCode:403,
        msgCtx: `密码不正确！`,
      })
    }
    else {
      // 生成token
      const token = jwtEnc(name, pass)
      res.cookie('token', token, { expires: new Date(Date.now() + 60*60*24*1*1000), httpOnly: true });
      res.send({
        msgCode:200,
        msgCtx: 'Login success.',
        token: token
      })
    }
  })
});

// 用户注销

router.post('/api/user/logout', (req, res, next) => {
  const isCookieExist = req.cookies.token
  if (isCookieExist) {
    res.clearCookie('token')
    res.send({
      msgCode:200,
      msgCtx: 'Logout success.'
    })
  }
  else {
    res.send({
      msgCode:304,
      msgCtx: '你还未登陆.'
    })
  }
})

// 用户资料
router.get('/api/user/info/:id', (req, res, next) => {

  const token = req.query.token
  jwtDec(token).then((tokenObj) => {
    // 获取用户资料
    info.findOne({
      user: req.params.id,
    }, (err,val) => {
      if (err) {
        res.send({
          msgCode:500,
          msgCtx: err,
        })
      }
      else if (val === null) {
        res.send({
          msgCode:404,
          msgCtx: '用户不存在.',
        })
      }
      else {
        res.send({
          msgCode:200,
          msgCtx: val,
        });
      }
    })
  })
});

// 修改密码
router.put('/api/user/pass', (req, res, next) => {

  const token = req.query.token
  jwtDec(token).then((tokenObj) => {
    const userName = tokenObj.user
    const passOld = cryptoPass(userName, req.body.passOld)
    const passNew = cryptoPass(userName, req.body.passNew)

    // 查询当前用户的账号
    user.findOne({
      name: userName,
    }, (err, val) => {

      // 输入的旧密码等于原始密码则执行
      // 不相等则返回提示信息
      if (val.pass === passOld) {

        // 更新成新密码
        user.update({
          name: userName,
        }, {
          $set: {
            pass: passNew,
          },
        }, (err) => {
          if (err) {
            res.send({
              msgCode:500,
              msgCtx: err,
            })
          }
          else {
            res.send({
              msgCode:200,
              msgCtx: 'Pass is changed.',
            })
          }
        })
      }
      else {
        res.send({
          msgCode:304,
          msgCtx: 'Old password is incorrect.',
        })
      }
    })
  })
})

// 修改个人信息
router.put('/api/user/info', (req, res, next) => {

  const token = req.query.token
  jwtDec(token).then((val) => {
    // 用户资料别名
    const userName = val.user
    const userGender = req.body.gender
    const userImg = req.body.img
    const userCity = req.body.city
    const userHobbies = req.body.hobbies.split(',')

    // 查询当前用户的账号
    info.findOne({
      user: userName,
    }, (err, val) => {

      // 更新资料
      info.update({
        user: userName,
      }, {$set: {
        gender: userGender,
        img: userImg,
        city: userCity,
        hobbies: userHobbies,
      }}, (err) => {

        // 提示错误信息
        if (err) {
          res.send({
            msgCode:500,
            msgCtx: err,
          })
        }

        // 提示成功
        else {
          res.send({
            msgCode:200,
            msgCtx: 'User info is changed.',
          })
        }
      })
    })
  })
})

module.exports = router
