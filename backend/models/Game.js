// models/Game.js
const { Chess } = require("chess.js");

class Game {
  constructor(gameId) {
    this.gameId = gameId;
    this.players = {}; // { sessionID: { userName, color, socketId } }
    this.moves = [];
    this.chessInstance = new Chess();
    this.isOver = false;
    this.result = null; // Stores the result when the game is over

    // Turn management properties
    this.currentTurnColor = "white"; // White starts the game
    this.turnTimer = null;
  }

  addPlayer(sessionID, userName, color, socketId) {
    this.players[sessionID] = {
      userName,
      color,
      socketId,
    };
  }

  removePlayer(sessionID) {
    delete this.players[sessionID];
  }

  getPlayerByColor(color) {
    return Object.values(this.players).find((player) => player.color === color);
  }

  getPlayerBySessionID(sessionID) {
    return this.players[sessionID];
  }

  isFull() {
    return this.getPlayerByColor("white") && this.getPlayerByColor("black");
  }

  makeMove(move, color) {
    if (this.isOver) {
      return { error: "Game is already over." };
    }

    if (this.currentTurnColor !== color) {
      return { error: "Not your turn" };
    }

    // Attempt to make the move
    const validMove = this.chessInstance.move(move);

    if (validMove) {
      this.moves.push(validMove.san);

      // Update the current turn color
      this.currentTurnColor =
        this.chessInstance.turn() === "w" ? "white" : "black";

      // Check for game over conditions
      if (this.chessInstance.isGameOver()) {
        this.isOver = true;
        this.result = this.getGameResult();
      }

      return { move: validMove.san };
    } else {
      return { error: "Invalid move" };
    }
  }

  getGameResult() {
    if (this.chessInstance.isCheckmate()) {
      const winnerColor = this.chessInstance.turn() === "w" ? "black" : "white"; // Since turn changes after move
      return `${winnerColor} wins by checkmate`;
    } else if (this.chessInstance.isStalemate()) {
      return "Draw by stalemate";
    } else if (this.chessInstance.isThreefoldRepetition()) {
      return "Draw by threefold repetition";
    } else if (this.chessInstance.isInsufficientMaterial()) {
      return "Draw by insufficient material";
    } else if (this.chessInstance.isDraw()) {
      return "Draw";
    } else {
      return "Game over";
    }
  }

  isGameOver() {
    return this.isOver;
  }

  scheduleDeletion(callback) {
    // Schedule game deletion after 5 minutes (300,000 milliseconds)
    this.deletionTimeout = setTimeout(() => {
      callback(this.gameId);
    }, 300000);
  }

  cancelDeletion() {
    if (this.deletionTimeout) {
      clearTimeout(this.deletionTimeout);
      this.deletionTimeout = null;
    }
  }

  getGameState() {
    return {
      gameId: this.gameId,
      players: Object.values(this.players).map((player) => ({
        userName: player.userName,
        color: player.color,
      })),
      moves: this.moves,
      isOver: this.isOver,
      result: this.result,
      currentTurnColor: this.currentTurnColor,
    };
  }

  // Turn timer management
  startTurnTimer(callback) {
    this.cancelTurnTimer();

    // Only start the timer if a player is present for the current turn's color
    const currentPlayer = this.getPlayerByColor(this.currentTurnColor);
    if (currentPlayer) {
      this.turnTimer = setTimeout(() => {
        callback(this.currentTurnColor, this.gameId);
      }, 33000); // 33 seconds
    }
  }

  cancelTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }
}

module.exports = Game;
