const conectToMonngo = require("./db");
const express = require("express");
const cors = require('cors')



conectToMonngo();
const app = express();
const port = process.env.PORT;



app.use(cors())
// Middleware to parse JSON payloads
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

//available routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/notes", require("./routes/notes"));

app.listen(port, () => {
  console.log(`Inotebook hosting at http://localhost:${port}`);
});
