const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Chess } = require("chess.js"); // Import chess.js

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const MAX_PLAYERS_PER_GAME = 2;
let games = {}; // { gameId: { gameId, players: [], moves: [] } }
let userGameMap = {}; // { userName: gameId }

app.post("/join-random-game", (req, res) => {
  const { userName } = req.body;

  // Check if the user is already in a game
  if (userGameMap[userName]) {
    return res.json({ success: true });
  }

  // Find an available game
  let game = Object.values(games).find(
    (g) => g.players.length < MAX_PLAYERS_PER_GAME
  );

  // If no available game, create a new one
  if (!game) {
    const gameId = `game-${Date.now()}`;
    game = {
      gameId,
      players: [],
      moves: [],
      chessInstance: new Chess(), // Initialize a new Chess instance for each game
    };
    games[gameId] = game;
  }

  // Add the user to the game
  game.players.push(userName);
  userGameMap[userName] = game.gameId;

  res.json({ success: true });
});

io.on("connection", (socket) => {
  socket.on("joinUserGame", ({ userName }) => {
    const gameId = userGameMap[userName];
    if (!gameId) {
      socket.emit("error", "No game found for this user.");
      return;
    }

    const game = games[gameId];
    if (!game) {
      socket.emit("error", "Game does not exist.");
      return;
    }

    socket.join(gameId);
    socket.emit("gameState", game);

    socket.on("makeMove", (move) => {
      // Recreate the chess game state on the server
      const chess = game.chessInstance;

      // Validate the move using chess.js
      const validMove = chess.move(move);

      if (validMove) {
        // If the move is valid, update the server-side game state
        game.moves.push(validMove);
        io.to(gameId).emit("gameState", game); // Broadcast the new game state to all players
      } else {
        // If the move is invalid, send an error back to the client
        socket.emit("error", "Invalid move");
      }
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected");
      const game = games[gameId];
      if (game) {
        // Remove user from the game
        game.players = game.players.filter((player) => player !== userName);
        delete userGameMap[userName];

        // If no players are left in the game, remove the game
        if (game.players.length === 0) {
          delete games[gameId];
        }
      }
    });
  });
});

server.listen(3001, () => {
  console.log("Server is running on port 3001");
});
