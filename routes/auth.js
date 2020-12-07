const express = require('express');
const User = require('../models/user');
const authController = require('../controllers/auth');
const {check ,body} = require('express-validator/check'); 


const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', [check('email','Please enter a valid login email')
.isEmail().normalizeEmail().custom((value, {req}) => {
     return User.findOne({email : value})
     .then(userDoc => {
       if(userDoc){
       return true;
       }else{
          return Promise.reject('Emial does not exists , Please pick a Registered one');
       }
    });
}),
check('password').isLength({min : 4}).isAlphanumeric().trim()
],authController.postLogin);

router.post('/signup', 
[check('email','Please enter a valid email')
.isEmail().normalizeEmail().custom((value, {req}) => {
     return User.findOne({email : value})
     .then(userDoc => {
       if(userDoc){
        return Promise.reject('Emial exists already, Please pick a different one');
       }
    });
}),
 body('password','Please enter a password with only numbers and text and at least 4 characters')
.isLength({min : 4})
 .isAlphanumeric().trim(),
 body('confirmPassword').trim().custom((value, {req}) =>{
      if(value !== req.body.password)
      {
       throw new Error('Password have to match');
      }
      return true;
  
})
],
authController.postSignup);

router.post('/logout', authController.postLogout);

router.get('/reset',authController.getReset);

router.post('/reset',authController.postReset);

router.get('/reset/:token',authController.getNewPassword);

router.post('/new-password',authController.postNewPassword);


module.exports = router;