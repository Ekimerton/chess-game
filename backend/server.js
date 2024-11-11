// server.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const app = express();
const server = http.createServer(app);

const sessionMiddleware = require("./middleware/sessionMiddleware");
const { router: gameRoutes, lobby } = require("./routes/gameRoutes");
const gameSocket = require("./socket/gameSocket");

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000", // Frontend URL
    credentials: true, // Allow credentials (cookies, headers, etc.)
  })
);

// Use session middleware
app.use(sessionMiddleware);

// Use game routes
app.use("/", gameRoutes);

// Setup Socket.io
gameSocket(server, sessionMiddleware, lobby);

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
