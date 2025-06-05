const express = require("express");
const User = require("../models/Users");
const Notes = require("../models/Notes")
const router = express.Router();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const jwt = require("jsonwebtoken");
const fetchuser = require("../middleware/fetchuser");
const JWT_SECRET = process.env.JSONTOKEN;
const {loginLimiter, deleteLimiter, signUpLimiter, VerifyOtpLimiter, forgetpwLimiter} = require("../middleware/limiters")

const nodemailer = require("nodemailer");

router.use(express.json());

const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const sendOTP = async (email, otpcode) => {
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
      subject: "Your OTP Code",
      text: `
      Your OTP code is: ${otpcode}`,
    };

    await transporter.sendMail(mailOptions);

    return true; // Successful send
  } catch (error) {
    // console.error("Error sending OTP:", error);
    return false; // Failed to send
  }
};

//ROUTE-1: create a user using POST "/api/auth/createUser". signup
router.post(
  "/createUser",
  [
    body("name", "Name feild cant be empty").isLength({ min: 3 }),
    body("email", "Enter valid email").isEmail(),
    body("password", "Enter password at least 8 character").isLength({
      min: 8,
    }),
  ],
  signUpLimiter,
  async (req, res) => {
    let success = false;
    //if there r errors return bads request and errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    //Check whether user with this email exists already
    try {
      let user = await User.findOne({ email: req.body.email });
      if (user && user.status) {
        return res
          .status(400)
          .json({
            success: false,
            errors: "Sorry a user with this email already exists",
          });
      }
      const securePassword = await bcrypt.hash(req.body.password, salt);

      // Generate OTP for the new user
      const otpcode = generateOtp();
      // console.log("ur otp code", otpcode);

      // If user exists but not verified, update OTP and password
if (user && !user.status) {
  user.name = req.body.name;
  user.password = securePassword;
  user.OtpCode = otpcode;
  user.otpTime = 1;
  await user.save();
} else {
  // If user doesn't exist, create new
      user = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: securePassword,
        OtpCode: otpcode,
        otpTime: 1,
        status: false, //initially status is false
      });
}
      const sendotp = await sendOTP(req.body.email, otpcode);

       if (sendotp){
    return res.json({ success: true, message: "OTP sent successfully" });
    }else{
      return res.json({ success: sendotp, message: "OTP failed to sent" });
    }
    } catch (error) {
      // console.error(error.message);
      return res.status(500).send("Internal Server Error");
    }
  }
);

// Route-2:  for verifying user with otp using post method "/api/auth/verify-otp"
router.post("/verify-otp",VerifyOtpLimiter, async (req, res) => {
  let success = false;
  const { email, OtpCode } = req.body;
  // console.log("Email req body:", email);
  // console.log("Otp by user otp: ", String(OtpCode));

  // Set a timeout to clear the OTP after 10 minutes (600,000 milliseconds)
  setTimeout(async () => {
    await User.updateOne({ email }, { $set: { otpTime: 0 } });
  }, 600000);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: success, message: "User not found" });
    }

    // console.log("User Found: verify otp", user);
    // console.log("OTP from DB:", user.OtpCode);
    // console.log("OTP from Request:", OtpCode);
    // console.log("OTP match:", user.OtpCode === OtpCode);
    // console.log("Email Match:", user.email === email);
    if (user.OtpCode !== OtpCode){
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if ( user.otpTime === 0) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    } 
     if ( user.email === email) {
      user.status = true; // Mark user as verified
      user.OtpCode = null; // Clear OTP
      await user.save();
      // console.log("User Found:", user);

      

      return res.json({
        success: true,
        message: "OTP verified successfully",
      });
    }
  } catch (error) {
    // console.error(error.message, OtpCode);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

//Route-3 for resend verification otp code taht expire using post method "/api/auth/resend"
router.post("/resend",VerifyOtpLimiter, async (req, res) => {
  try {
    const otpEmail = req.body.email; //taking email
    // Generate OTP for the new user
    const otpcode = generateOtp();

    //update otp of  user
    const user = await User.updateOne(
      { email: otpEmail },
      { $set: { OtpCode: otpcode, otpTime: 1 } }
    ); // updating only those which need this

    const sendotp = await sendOTP(req.body.email, otpcode);
    if (sendotp){
    return res.json({ success: true, message: "OTP sent successfully" });
    }else{
      return res.json({ success: sendotp, message: "OTP failed to sent" });
    }
  } catch (error) {
    // console.error(error.message);
    return res.status(500).send({success: false, message:"Internal Server Error"});
  }
});

//ROUTE-4: Authenticate user using POST "/api/auth/login". login
router.post(
  "/login",
  [
    body("email", "Enter valid email").isEmail(),
    body("password", "Password cant be blank").exists(),
  ],loginLimiter,
  async (req, res) => {
    let success = false;
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
          .json({
            success,
            message: "This email doesnot exist, please try again with valid email",
          });
      } else if (!user.status) {
        return res
          .status(400)
          .json({ success: false, message: "First verify your Email" });
      }

      // console.log(user.id);
      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Invalid email or Passowrd, please try again",
          });
      }

      const data = {
        user: {
          id: user._id,
        },
      };
      const token = await jwt.sign(data, JWT_SECRET);

     return  res.json({
        success: true,
        token: token,
        name: user.name,
        
      });
    } catch (error) {
      /*  console.error(error.message); */
     return  res.status(500).send({success: false,message:"Internal Server Error"});
    }
  }
);
//ROUTE-5: Get logged in User Detail using : POST   "/api/auth/getuser". login require
router.post("/getuser", fetchuser, async (req, res) => {
  // checking authentication token of user and get detail
  try {
    const userId = req.user.id;
    let user = await User.findById(userId).select("-password");
     if (!user) {
      // User not found, possibly deleted
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    return res.send({ success: true, user:{name: user.name, email: user.email} });
  } catch (error) {
    /*  console.error(error.message); */
    return res.status(500).send({success: false,message:"Internal Server Error"});
  }
});

// Route-6: Delete user acccount permanently from database using : delete  "/api/auth/deleteuserId/:id"
router.delete("/deleteuserId", fetchuser,deleteLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    // find and delete the user note before deleting user
     await Notes.deleteMany({ user: userId });

    // Find and delete the user
    const deleteUser = await User.findByIdAndDelete(userId);

    if (!deleteUser) {
      return res.status(404).json({ success:false,error: "User not found" });
    }
    
    return res.status(200).json({success:true, message: "User account deleted successfully", user: deleteUser });
  } catch (error) {
    // console.error(error.message);
    return res.status(500).send({success: false, message: "Internal Server Error"});
  }
});

// Route-7 Forget password  using POST method "/api/auth/forget-password"
router.post("/forget-password",forgetpwLimiter, async (req, res) => {
  let success = false;
  //if there r errors return bads request and errors
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email } = req.body;
  // console.log(email);
  if (!email) {
    return res
      .status(404)
      .json({ success: success, message: "Email cannot be empty" });
  }
  try {
    let user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: success, message: "User of this email not found" });
    }
    // console.log("user.email is ", user.email);
    try {
      // console.log("in email sending otp ", user.password);
      const otpcode = generateOtp(); //remaking otp code
      // console.log("OTP code is in string :", otpcode);
      await User.updateOne(
        { email },
        { $set: { OtpCode: otpcode, otpTime: 1 } }
      );
      const sendotp = await sendOTP(email, otpcode);
      // console.log(sendotp, email, otpcode);
      success = true
      return res
        .status(200)
        .json({ success: success, message: "OTP sent successfully" });
    } catch (error) {
      success = false
      return res
        .status(500)
        .json({ success: success, message: "Failed to sent otp" });
    }
  } catch (error) {
    // console.error(error);
    return res.status(500).json({ success: success, message: "Server error" });
  }
});

// Route-8 Forget password  using POST method "/api/auth/forget-password"
router.post("/resetpw",forgetpwLimiter, async (req, res) => {
  const { email, password } = req.body;
  // console.log("set pw path ", email, password);
  let success = false;
  

  try{
    let user = await User.findOne({email});
    // console.log("resetpw path", user)
  //console.log("db original pw", user.password);
  
    // console.log(password,"resetpw user set pw");
    const pw = user.password;
    // console.log("db set pw ", pw);

const passwordCompare1 = await bcrypt.compare(password, pw);


 if(passwordCompare1){
  return res
  .status(400)
  .json({ success, message: "Choose a different Password" });
}else{
  const securePassword = await bcrypt.hash(password, salt);
  // console.log(password, securePassword);
  await User.updateOne({email }, { $set: { password: securePassword } });
  success = true
  return res.status(200).json({ success: success , message: 'Password updated successfully' });
}}
catch (error) {
  // console.error(error);
  return res.status(500).json({ success: success, message: 'Server error' });
}
});

module.exports = router;
