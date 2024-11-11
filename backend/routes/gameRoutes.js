// routes/gameRoutes.js
const express = require("express");
const router = express.Router();
const Lobby = require("../models/Lobby");

const lobby = new Lobby();

// Set user name
router.post("/set-name", (req, res) => {
  const { userName } = req.body;

  if (!userName || typeof userName !== "string" || !userName.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid userName" });
  }

  // Save the userName in the session
  req.session.userName = userName.trim();

  res.json({ success: true });
});

// Get user name
router.get("/get-name", (req, res) => {
  const userName = req.session.userName;

  if (userName) {
    res.json({ success: true, userName });
  } else {
    res.json({ success: false, message: "No userName in session" });
  }
});

// Leave current game and join a new one
router.post("/leave-and-join-new-game", (req, res) => {
  const sessionID = req.session.id;
  const userName = req.session.userName;

  if (!userName) {
    return res.status(400).json({
      success: false,
      message: "No userName in session. Please set your name first.",
    });
  }

  // Leave the current game
  const gameId = req.session.gameId;
  const color = req.session.color;

  if (gameId) {
    const game = lobby.games[gameId];

    if (game) {
      // Remove player from game
      game.removePlayer(sessionID);

      // If game is empty, delete it
      if (Object.keys(game.players).length === 0) {
        lobby.deleteGame(gameId);
      } else {
        // If game is not full, add it back to waiting games
        if (!game.isFull() && !lobby.waitingGames.includes(game)) {
          lobby.waitingGames.push(game);
        }
      }
    }

    // Blacklist the game for the user
    if (!req.session.blacklistedGames) {
      req.session.blacklistedGames = [];
    }
    req.session.blacklistedGames.push(gameId);

    // Remove game data from session
    delete req.session.gameId;
    delete req.session.color;
  }

  // Save session before proceeding
  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Session error." });
    }

    // Now, join a new game
    if (!req.session.blacklistedGames) {
      req.session.blacklistedGames = [];
    }

    let game = lobby.findAvailableGame(req.session.blacklistedGames);

    if (!game) {
      game = lobby.createGame();
    }

    // Determine available color
    let colorToAssign;
    if (!game.getPlayerByColor("white")) {
      colorToAssign = "white";
    } else if (!game.getPlayerByColor("black")) {
      colorToAssign = "black";
    } else {
      // Game is full (should not happen)
      return res
        .status(400)
        .json({ success: false, message: "Game is already full." });
    }

    // Add the player to the game
    game.addPlayer(sessionID, userName, colorToAssign, null);

    req.session.gameId = game.gameId;
    req.session.color = colorToAssign;

    if (game.isFull()) {
      lobby.removeWaitingGame(game.gameId);
    }

    // Save session after joining the new game
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Session error." });
      }
      res.json({ success: true, gameId: game.gameId, color: colorToAssign });
    });
  });
});

module.exports = { router, lobby };
