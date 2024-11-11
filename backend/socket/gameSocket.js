// gameSocket.js
const { Server } = require("socket.io");

function gameSocket(server, sessionMiddleware, lobby) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // Frontend URL
      credentials: true, // Allow credentials in socket connections
    },
  });

  io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
  });

  io.on("connection", (socket) => {
    const session = socket.request.session;
    const sessionID = session.id;
    const userName = session.userName;
    let gameId = session.gameId;
    let color = session.color;

    if (!userName) {
      socket.emit("error", "User not authenticated");
      return;
    }

    if (!gameId || !color) {
      socket.emit("error", "User is not in a game. Please join a game first.");
      return;
    }

    const game = lobby.games[gameId];

    if (!game) {
      socket.emit("error", "Game does not exist.");
      delete session.gameId;
      delete session.color;
      session.save();
      return;
    }

    // Update or add player in the game
    let player = game.getPlayerBySessionID(sessionID);

    if (player) {
      // Update socketId
      player.socketId = socket.id;
    } else {
      // Re-adding player to the game (in case of reconnection)
      game.addPlayer(sessionID, userName, color, socket.id);
    }

    // Save session
    session.save();

    // Join the game room
    socket.join(gameId);

    // Send game state and personal info
    socket.emit("gameState", game.getGameState());
    socket.emit("personalInfo", {
      yourColor: color,
      yourName: userName,
    });

    // Notify others
    socket.to(gameId).emit("gameState", game.getGameState());

    // Start the turn timer if necessary
    if (game.currentTurnColor === color && !game.turnTimer) {
      game.startTurnTimer(handlePlayerTimeout);
    }

    // Handle move events
    socket.on("makeMove", (move) => {
      handleMakeMove(socket, game, move);
    });

    // Handle leave game
    socket.on("leaveGame", () => {
      handlePlayerLeavingGame(socket, game, io);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User ${userName} disconnected`);
      handlePlayerDisconnection(socket, game);
    });

    function handleMakeMove(socket, game, move) {
      const session = socket.request.session;
      const sessionID = session.id;
      const color = session.color;

      const result = game.makeMove(move, color);

      if (result.error) {
        socket.emit("error", result.error);
      } else {
        // Broadcast the updated game state
        io.to(game.gameId).emit("gameState", game.getGameState());

        if (game.isGameOver()) {
          game.cancelTurnTimer();

          io.to(game.gameId).emit("gameOver", {
            result: game.result,
          });

          game.scheduleDeletion((gameIdToDelete) => {
            handleGameDeletion(gameIdToDelete);
          });

          io.to(game.gameId).emit(
            "info",
            "This game will be deleted in 5 minutes."
          );
        } else {
          // Cancel previous timer and start a new one
          game.cancelTurnTimer();

          if (game.getPlayerByColor(game.currentTurnColor)) {
            game.startTurnTimer(handlePlayerTimeout);
          }
        }
      }
    }

    function handlePlayerDisconnection(socket, game) {
      const session = socket.request.session;
      const sessionID = session.id;

      const player = game.getPlayerBySessionID(sessionID);

      if (player) {
        // Remove the player's socket ID
        player.socketId = null;

        // Optionally, implement a timeout to remove the player if they don't reconnect
        // For now, we will keep the player in the game
      }
    }

    function handlePlayerLeavingGame(socket, game, io) {
      const session = socket.request.session;
      const sessionID = session.id;
      const color = session.color;

      if (!game || !color) {
        socket.emit("error", "User is not in a game.");
        return;
      }

      // Remove the player from the game
      game.removePlayer(sessionID);

      // Cancel the turn timer if necessary
      if (game.currentTurnColor === color) {
        game.cancelTurnTimer();
      }

      // Notify others
      socket.to(game.gameId).emit("opponentLeft", {
        message: `Player ${session.userName} has left the game.`,
      });

      // Determine the game result
      if (Object.keys(game.players).length === 0) {
        // No players left, delete the game
        game.cancelDeletion();
        handleGameDeletion(game.gameId);
      } else {
        // The remaining player wins
        game.isOver = true;
        const remainingPlayer = Object.values(game.players)[0];
        game.result = `${remainingPlayer.color} wins by opponent leaving`;

        io.to(game.gameId).emit("gameOver", {
          result: game.result,
        });

        // Schedule the game for deletion
        game.scheduleDeletion((gameIdToDelete) => {
          handleGameDeletion(gameIdToDelete);
        });

        // Inform players
        io.to(game.gameId).emit(
          "info",
          "This game will be deleted in 5 minutes."
        );
      }

      // Update session
      delete session.gameId;
      delete session.color;

      // Blacklist the game
      if (!session.blacklistedGames) {
        session.blacklistedGames = [];
      }
      session.blacklistedGames.push(game.gameId);

      // Save session
      session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
        }

        socket.leave(game.gameId);
        socket.emit("leftGame", { success: true });
      });
    }

    function handlePlayerTimeout(expiredColor, gameId) {
      const game = lobby.games[gameId];
      if (!game) {
        return;
      }

      const expiredPlayer = game.getPlayerByColor(expiredColor);

      if (expiredPlayer) {
        const socketId = expiredPlayer.socketId;
        const sessionID = Object.keys(game.players).find(
          (id) => game.players[id] === expiredPlayer
        );

        const socket = io.sockets.sockets.get(socketId);

        if (socket) {
          const session = socket.request.session;

          // Blacklist the game for the player
          if (!session.blacklistedGames) {
            session.blacklistedGames = [];
          }
          session.blacklistedGames.push(gameId);

          // Remove game data from session
          delete session.gameId;
          delete session.color;

          // Save the session before disconnecting
          session.save((err) => {
            if (err) {
              console.error("Session save error:", err);
            }

            socket.emit("kicked", "You have been kicked due to inactivity.");

            // Disconnect the socket after session is saved
            socket.disconnect(true);
          });
        }

        // Remove the player from the game
        game.removePlayer(sessionID);

        // Notify others
        io.to(gameId).emit("opponentKicked", {
          message: `Player with color ${expiredColor} was kicked due to inactivity.`,
        });

        // Cancel any running timers
        game.cancelTurnTimer();

        // Determine the game result
        if (Object.keys(game.players).length === 0) {
          // If no players are left, delete the game
          game.cancelDeletion();
          handleGameDeletion(gameId);
        } else {
          // The remaining player wins
          game.isOver = true;
          const remainingPlayer = Object.values(game.players)[0];
          game.result = `${remainingPlayer.color} wins by opponent timeout`;

          io.to(gameId).emit("gameOver", {
            result: game.result,
          });

          // Schedule the game for deletion after 5 minutes
          game.scheduleDeletion((gameIdToDelete) => {
            handleGameDeletion(gameIdToDelete);
          });

          // Inform the remaining player
          io.to(gameId).emit("info", "This game will be deleted in 5 minutes.");
        }
      }
    }

    function handleGameDeletion(gameIdToDelete) {
      const gameToDelete = lobby.games[gameIdToDelete];
      if (gameToDelete) {
        // Cancel any running timers
        gameToDelete.cancelTurnTimer();

        // Notify players
        io.to(gameIdToDelete).emit(
          "gameDeleted",
          "This game has been deleted from the server."
        );

        // Disconnect all sockets in the room
        const socketsInRoom = io.sockets.adapter.rooms.get(gameIdToDelete);
        if (socketsInRoom) {
          socketsInRoom.forEach((socketId) => {
            const socketToDisconnect = io.sockets.sockets.get(socketId);
            if (socketToDisconnect) {
              // Remove game data from session
              const session = socketToDisconnect.request.session;
              delete session.gameId;
              delete session.color;

              // Save session and disconnect
              session.save(() => {
                socketToDisconnect.leave(gameIdToDelete);
                socketToDisconnect.disconnect(true);
              });
            }
          });
        }

        // Delete the game
        lobby.deleteGame(gameIdToDelete);
        console.log(`Game ${gameIdToDelete} has been deleted from the server.`);
      }
    }
  });
}

module.exports = gameSocket;
