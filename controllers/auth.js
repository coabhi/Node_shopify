const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendGridTransport = require('nodemailer-sendgrid-transport');

const {validationResult} = require('express-validator/check');
const User = require('../models/user');
const { EACCES } = require('constants');

const transporter = nodemailer.createTransport(sendGridTransport(
  {
    auth : {
      api_key : `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`
    }
  }
))
exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0)
  {
    message = message[0];
  }else{
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage : message,
    oldInput : {
      email : '',
      password : ''
    },validationError : []
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if(message.length > 0)
  {
    message = message[0];
  }else{
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage : message,
    oldInput : {
      email : '',
      password : '',
      confirmPassword : ''
    },
    validationError : []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if(!errors.isEmpty())
  {
    return res.render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage : errors.array()[0].msg,
      oldInput : {
        email : email,
        password : password
      },
      validationError : errors.array()
    });
  }
  User.findOne({email : email})
    .then(user => {
      bcrypt.compare(password,user.password)
      .then(doMatch => {
         if(doMatch)
         {
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save(err => {
             console.log(err);
             res.redirect('/');
         });
         }
         console.log(errors.array);
         return res.render('auth/login',{
          path: '/login',
          pageTitle: 'Login',
          errorMessage : 'Invalid password, Please check again',
          oldInput : {
            email : email,
            password : password
          },
          validationError : errors.array()
         });
      })
       .catch(err =>{
        console.log(err);
        res.redirect('/login');
      })
    })
    .catch(err =>
      {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if(!errors.isEmpty())
  {
    console.log(errors.array()); 
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage : errors.array()[0].msg,
      oldInput : {
        email : email,
        password : password,
        confirmPassword : req.body.confirmPassword
      },
      validationError : errors.array()
    });
  }
  User.findOne({email : email})
  .then(userDoc => {
    if(userDoc){
      req.flash('error','Email exists already, please pick different one.');
      return res.redirect('/signup');
    }
     return bcrypt.hash(password,12)
     .then(hashedPassword =>{
      const user = new User({
        email : email,
        password : hashedPassword,
        cart : { items : [] }
      });
      return user.save();
    })
    .then(result => {
      res.redirect('/login');
      return transporter.sendMail({
        to : email,
        from : 'balberto@udasity.com',
        subject : 'successfully signup',
        html : '<h1>you successfully signed up</h1>'
      });
     
    }).catch(err => {
      console.log(err);
    });
  })
  .catch(err =>
    {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req, res,next ) => {
  let message = req.flash('error');
  if(message.length > 0)
  {
    message = message[0];
  }else{
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage : message
  });
}
exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if(err)
    {
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({email : req.body.email})
    .then(user => {
      if(!user){
        req.flash('error', 'No account with that email found');
         return res.redirect('/reset');
      }
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000;
      return user.save();
    }).then(result => {
      res.redirect('/');
      transporter.sendMail({
        to : req.body.email,
        from : 'balberto@udasity.com',
        subject : 'Password Reset',
        html : 
        `<p> you requested a password reset</p>
         <P> Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password</p>
        `
      });
    })
    .catch(err =>
      {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
}

exports.getNewPassword = (req , res, next) =>{
  const token = req.params.token;
  User.findOne({
    resetToken : token,
    resetTokenExpiration : {$gt : Date.now()}
  }).then(user =>{
    let message = req.flash('error');
    if(message.length > 0)
    {
      message = message[0];
    }else{
      message = null;
    }
    res.render('auth/new-password', {
      path: '/new-password',
      pageTitle: 'New Password',
      errorMessage : message,
      userId : user._id.toString(),
      passwordToken :  token
    });
  }
  ).catch(err => {
    console.log(err);
  });
}

exports.postNewPassword = (req, res, next) =>{
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken= req.body.passwordToken;
  let resetUser;
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration : {$gt : Date.now()},
    _id : userId
  }).then(user => {
    resetUser = user;
    return bcrypt.hash(newPassword,12);
  }).then(hashedPassword =>{
    resetUser.password = hashedPassword;
    resetUser.resetToken = null;
    resetUser.resetTokenExpiration = undefined;
    resetUser.save();
  }).then(result => {
    res.redirect('/login');
  }).catch(err => {
    console.log(err);
  })
}