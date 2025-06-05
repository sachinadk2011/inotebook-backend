const conectToMonngo = require("./db");
const express = require("express");
const cors = require('cors')
const path = require("path");



conectToMonngo();
const app = express();
const port = process.env.PORT;



app.use(cors())
// Middleware to parse JSON payloads
app.use(express.json());


//available routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/notes", require("./routes/notes"));



app.listen(port, () => {
  console.log(`Inotebook hosting at http://localhost:${port}`);
});
