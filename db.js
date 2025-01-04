const mongoose = require("mongoose");
const mongoURL = "mongodb://localhost:27017/inotebook";

const connnectToMongo = async () => {
  try {
    await mongoose.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB successfully, inotebook");
  } catch (err) {
    console.error("Connection Error:", err);
  }
};

module.exports = connnectToMongo;
