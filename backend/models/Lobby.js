// models/Lobby.js
const Game = require("./Game");

class Lobby {
  constructor() {
    this.games = {};
    this.waitingGames = [];
    this.gameIdCounter = 1;
  }

  createGame() {
    const gameId = `game_${this.gameIdCounter++}`;
    const game = new Game(gameId);
    this.games[gameId] = game;
    this.waitingGames.push(game);
    return game;
  }

  findAvailableGame(blacklistedGames = []) {
    // Filter waiting games that are not full and not blacklisted
    const availableGames = this.waitingGames.filter(
      (game) => !game.isFull() && !blacklistedGames.includes(game.gameId)
    );
    return availableGames.length > 0 ? availableGames[0] : null;
  }

  removeWaitingGame(gameId) {
    this.waitingGames = this.waitingGames.filter(
      (game) => game.gameId !== gameId
    );
  }

  deleteGame(gameId) {
    delete this.games[gameId];
    this.removeWaitingGame(gameId);
  }
}

module.exports = Lobby;
