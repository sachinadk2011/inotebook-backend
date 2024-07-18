const conectToMonngo = require('./db');
const express = require('express')

conectToMonngo();

const app = express()
const port = 5000

// Middleware to parse JSON payloads
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is up and running');
});

//available routes
app.use('/api/auth', require("./routes/auth"))
app.use('/api/notes', require("./routes/notes"))


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})