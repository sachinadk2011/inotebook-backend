const mongoose = require("mongoose");
const mongoURL = process.env.Db_Url;

const connnectToMongo = async () => {
  try {
    await mongoose.connect(mongoURL);
    console.log("Connected to MongoDB successfully, inotebook");
  } catch (err) {
    console.error("Connection Error:", err);
  }
};

module.exports = connnectToMongo;
