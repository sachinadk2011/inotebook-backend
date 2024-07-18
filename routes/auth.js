const express = require('express');
const User = require('../models/Users');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'hdsjgkh$sghg@udbfhh';
//create a user using POST "/api/auth/createUser". signup
router.post('/createUser',[
    body('name', "Name feild cant be empty").isLength({min: 3}),
    body('email', "Enter valid email").isEmail(),
    body('password', "Enter password at least 8 character").isLength({min: 1})

], async (req,res)=>{
    //if there r errors return bads request and errors
    const errors = validationResult(req);
    /* console.log(errors); */
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() });
    }
    //Check whether user with this email exists already 
    try{
   let user = await User.findOne({email: req.body.email})
   if (user){
    return res.status(400).json({errors: "Sorry a user with this email already exists"})
   }
   securePassword = await bcrypt.hash(req.body.password, salt); 
   console.log(salt);
   //creating new user 
    user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: securePassword
    })
    const data = {
        user:{
            id: user.id
        }
    }
   const token = await jwt.sign(data, JWT_SECRET);
   console.log(token)
  res.json({token});
}
catch(error){
    console.error( error.message)
    res.status(500).send("Some Error occured")};
})

module.exports = router