const express = require("express");
const bodyParser = require('body-parser');
const uuid = require("uuid");
const speakeasy = require("speakeasy");
const JsonDB = require('node-json-db').JsonDB;
const Config = require('node-json-db/dist/lib/JsonDBConfig').Config;
// const mongoose = require('mongoose');

const app = express();

/*
* const dbConfig = new Config("myDataBase", true, false, '/')
* const db = new JsonDB(dbConfig);
*/

// Shortcut Code
const db = new JsonDB(new Config('myDatabase', true, false, '/'))


// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get("/api", (req,res) => {
  res.json({ message: "Welcome to the two factor authentication exmaple" })
});


app.post("/api/register", (req, res) => {
  const id = uuid.v4();
    try {
        const path = `/user/${id}`;
        // Create temporary secret until it it verified
        const temp_secret = speakeasy.generateSecret();
        // Create user in the database
        db.push(path, { id, temp_secret });
        // Send user id and base32 key to user
        res.json({ id, secret: temp_secret.base32 })
    } catch(e) {
        console.log(e);
        res.status(500).json({ message: 'Error generating secret key'})
    }
  })


  function getDataAsync(path) {
    return new Promise((resolve, reject) => {
      try {
        const data = db.getData(path);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  app.post("/api/verify", async (req, res) => {
    const { userId, token } = req.body;
    try {
      // Retrieve user from database
      const path = `/user/${userId}`;
      const user = await getDataAsync(path); // Use custom getDataAsync function
      console.log({ user });
      const { base32: secret } = user.temp_secret || {};
      const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token,
      });
      if (verified) {
        // Update user data
        db.push(path, { id: userId, secret: user.temp_secret });
        res.json({ verified: true });
      } else {
        res.json({ verified: false });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error retrieving user" });
    }
  });

/* mongoose.connect('mongodb+srv://admin:admin@authenticatordb.d6kvalh.mongodb.net/Authenticator-NODE?retryWrites=true&w=majority')
  .then(() => {
    console.log('MongoDB is Already Connected!')


  }).catch((error) => {
    console.log(error);
  }); */

  const port = 9000;
  app.listen(port, () => {
    console.log(`App is running on PORT: ${port}.`);
  });
