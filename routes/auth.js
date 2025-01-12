const express = require("express");
const User = require("../models/Users");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const jwt = require("jsonwebtoken");
const fetchuser = require("../middleware/fetchuser");
const JWT_SECRET = process.env.JSONTOKEN;

const nodemailer = require('nodemailer');



router.use(express.json());



const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
}



const sendOTP = async (email, otpcode) => {
  console.log("error in sendotp ",email,otpcode);
  
  try {
    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

       // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code',
      text: `
      Your OTP code is: ${otpcode}`,
    }
    console.log("error after mailoptions ", email.email);
      await transporter.sendMail(mailOptions);
     
      return true; // Successful send
    } catch (error) {
      console.error("Error sending OTP:", error);
      return false; // Failed to send
    }
  };
  

//ROUTE-1: create a user using POST "/api/auth/createUser". signup
router.post("/createUser",
  [
    body("name", "Name feild cant be empty").isLength({ min: 3 }),
    body("email", "Enter valid email").isEmail(),
    body("password", "Enter password at least 8 character").isLength({
      min: 8,
    }),
  ],
  async (req, res) => {
    let success= false;
    //if there r errors return bads request and errors
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    //Check whether user with this email exists already
    try {
      let user = await User.findOne({ email: req.body.email });
      if (user && user.status) {
        return res.status(400).json({ success: false, errors: "Sorry a user with this email already exists" });
      }
      const securePassword = await bcrypt.hash(req.body.password, salt);
      
      // Generate OTP for the new user
      const otpcode = generateOtp();
      console.log("ur otp code" ,otpcode);

      //creating new user
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: securePassword,
        OtpCode : otpcode,
        otpTime : 1,
        status : false //initially status is false 
      });
      const sendotp = await sendOTP(req.body.email, otpcode);
      
      console.log(sendotp);
      res.json({ success: sendotp, message: 'OTP sent successfully' });
      

     
  
  

  
  
} catch (error) {
  console.error(error.message);
  res.status(500).send("Internal Server Error");
}
}
);

// Route-2:  for verifying user with otp using post method "/api/auth/verify-otp"
router.post('/verify-otp', async (req, res) => {
  let success= false;
  const { email, OtpCode } = req.body;
  console.log("Email req body:", email);
  console.log("Otp by user otp: ", String(OtpCode));
  
  
  // Set a timeout to clear the OTP after 10 minutes (600,000 milliseconds)
  setTimeout(async () => {  await User.updateOne({ email: otpEmail }, { $set: { otpTime: 0 } }); }, 600000);


try {
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
    console.log("User Found:", user);
    console.log("OTP from DB:", user.OtpCode);
    console.log("OTP from Request:", OtpCode);
    console.log("OTP match:",user.OtpCode=== OtpCode);
    console.log("Email Match:", user.email === email);
    
    if(user.OtpCode === OtpCode && user.otpTime === 0){
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }else if (user.OtpCode === OtpCode && user.email === email) {
      
      user.status = true; // Mark user as verified
      user.OtpCode = null; // Clear OTP
      await user.save();
      console.log("User Found:", user);
      
      const token = await jwt.sign({ id: user.id }, JWT_SECRET);
  
      return res.json({success:true, token, message: 'OTP verified successfully' }); 
    } else {
      console.log("OTP from user:", OtpCode);
console.log("OTP from database:", user.OtpCode);
console.log("Parsed OTP:", parseInt(OtpCode, 10));
console.log("Email req body:", email);
  console.log("Otp by user otp: ", OtpCode);

      await User.deleteOne({ email: req.body.email  });
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
      
      
    }
  } catch (error) {
    console.error(error.message, OtpCode);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

//Route-3 for resend verification otp code taht expire using post method "/api/auth/resend"
router.post(
  "/resend",
  async (req, res) => {
    
    
    try {
      const otpEmail= req.body.email;//taking email 
     // Generate OTP for the new user
     const otpcode = generateOtp();
      
      
      //update otp of  user
     const user = await User.updateOne({ email: otpEmail }, { $set: { OtpCode: otpcode, otpTime: 1 } });// updating only those which need this 
    
     const sendotp = await sendOTP(req.body.email, otpcode);
     res.json({ success: sendotp, message: 'OTP sent successfully' });
    
    
  } catch (error) {
    console.error(error.message);
  res.status(500).send("Internal Server Error");
    
  }
}
);

//ROUTE-4: Authenticate user using POST "/api/auth/login". login
router.post(
  "/login",
  [
    body("email", "Enter valid email").isEmail(),
    body("password", "Password cant be blank").exists(),
  ],
  async (req, res) => {
    let success= false;
    //if there r errors return bads request and errors
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({ success, errors: errors.array() });
    }
    const { email, password } = req.body;
    //Check whether user with this email exists already
    try {
      let user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ success, errors: "Invalid email or Passowrd, please try again" });
      }else if(!user.status){
        return res.status(400).json({success:false, message: "First verify your Email"});
      }

      console.log(user.id);
      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res
          .status(400)
          .json({ success, errors: "Invalid email or Passowrd, please try again" });
      }

      const data = {
        user: {
          id: user.id,
        },
      };
      const token = await jwt.sign(data, JWT_SECRET);
     
      res.json({
        success: true,
        token: token,
        name: user.name
      });
      
    } catch (error) {
     /*  console.error(error.message); */
      res.status(500).send("Internal Server Error");
    }
  }
);
//ROUTE-5: Get logged in User Detail using : POST   "/api/auth/getuser". login require
router.post("/getuser", fetchuser, async (req, res) => {
  // checking authentication token of user and get detail
  try {
    const userId = req.user.id;
    let user = await User.findById(userId).select("-password");
    res.send(user);
  } catch (error) {
   /*  console.error(error.message); */
    res.status(500).send("Internal Server Error");
  }
});

// Route-6: Delete user acccount permanently from database using : delete  "/api/auth/deleteuserId/:id" 
router.delete("/deleteuserId/:id", fetchuser, async (req, res) => {
  try {
    // Get user ID from token and validate it matches the request
    const userIdFromToken = req.user.id; // Authenticated user's ID from token
    const userIdFromParam = req.params.id; // ID from the route parameter

    console.log(userIdFromParam  ,  userIdFromToken);
    // Ensure the authenticated user is deleting their own account
    if (userIdFromToken !== userIdFromParam) {
      return res.status(403).json({ error: "Unauthorized action" });
    }

    // Find and delete the user
    const user = await User.findByIdAndDelete(userIdFromParam);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User account deleted successfully", user });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
});

// Route-6 Forget password  using POST method "/api/auth/forget-password"
router.post("/forget-password", 
  async(req, res)=>{
  let success = false;
  //if there r errors return bads request and errors
  const errors = validationResult(req);
    
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  };
  
  const { email } = req.body;
  console.log(email);
  try {
    
    
    let user = await User.findOne({ email});
    console.log("user.email is ",user.email);

    if(!user){
      return res.status(404).json({ success, message: 'User not found' });
    }
    if(!email){
      return res.status(404).json({success, message:"Email cannot be empty"});
    }
  try {
    console.log("in email sending otp ", user.password);
    const otpcode= generateOtp();//remaking otp code
    console.log("OTP code is in string :", otpcode);
    await User.updateOne({email }, { $set: { OtpCode: otpcode, otpTime: 1 } });
    const sendotp = await sendOTP(email, otpcode);
    console.log(sendotp ,  email, otpcode);
    return res.status(200).json({ success: sendotp, message: "OTP sent successfully"});
  } catch (error) {
    return res.status(200).json({ success: false, message: "Failed to sent otp"});
  }
  
     
}
    
  catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Route-6 Forget password  using POST method "/api/auth/forget-password"
router.post("/resetpw", async(req, res)=>{
   
  try{
  console.log("db original pw", req.body.password);
  const {password} = req.body;
    console.log(password,"resetpw user set pw");
    const pw = req.body.password;
    console.log("db set pw ", pw);

const passwordCompare1 = await bcrypt.compare(password, pw);


 if(passwordCompare1){
  return res
  .status(400)
  .json({ success, message: "Choose a different Password" });
}else{
  const securePassword = await bcrypt.hash(req.body.password, salt);
  console.log(req.body.password, securePassword);
  await User.updateOne({email: req.body.email }, { $set: { password: securePassword } });
  return res.status(200).json({ success: true, message: 'Password updated successfully' });
}}
catch (error) {
  console.error(error);
  res.status(500).json({ success: false, message: 'Server error' });
}
});
module.exports = router;
