const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  OtpCode:{
    type : String,
    validate: {
      validator: function(value) {
        // Only require OtpCode if the status is false
        return this.status === false ? value != null : true; // If status is false, OtpCode is required
      },
      message: 'OtpCode is required when status is false',
    },
  },
  otpTime:{
    type: Number,
    required: true,
  },
  status:{
    type: Boolean,
    default: false
  }
});
const User = mongoose.model("user", UserSchema);

module.exports = User;
