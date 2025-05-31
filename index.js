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

// Serve static files from the frontend
app.use(express.static(path.join(__dirname, "client/build"))); // Adjust path if needed

// Catch-all route to serve React index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});


app.listen(port, () => {
  console.log(`Inotebook hosting at http://localhost:${port}`);
});
