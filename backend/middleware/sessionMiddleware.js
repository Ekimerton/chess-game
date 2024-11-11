// middleware/sessionMiddleware.js
const session = require("express-session");

const sessionMiddleware = session({
  secret: "testing-key",
  resave: false,
  saveUninitialized: true,
});

module.exports = sessionMiddleware;
