"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

export default function GamePageClient() {
  const router = useRouter();
  const [gameState, setGameState] = useState(null);
  const [socket, setSocket] = useState(null);
  const [game, setGame] = useState(new Chess());
  const [yourColor, setYourColor] = useState("");
  const [yourName, setYourName] = useState("");
  const [timeLeft, setTimeLeft] = useState(null); // Timer starts when gameState is received
  const timerRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection with credentials
    const newSocket = io("http://localhost:3001", {
      withCredentials: true,
    });
    setSocket(newSocket);

    // Socket event handlers
    newSocket.on("gameState", (state) => {
      setGameState(state);

      // Update the local chess game state
      const newGame = new Chess();
      state.moves.forEach((move) => {
        newGame.move(move);
      });
      setGame(newGame);

      // Reset the timer whenever a new gameState is received
      resetTimer();
    });

    newSocket.on("personalInfo", (data) => {
      setYourColor(data.yourColor);
      setYourName(data.yourName);
    });

    newSocket.on("gameOver", (data) => {
      alert(`Game Over: ${data.result}`);
      // Inform the user that the game will be deleted in 5 minutes
      alert("This game will be deleted in 5 minutes.");
      // Stop the timer
      clearTimer();
    });

    newSocket.on("error", (message) => {
      alert(message);
      router.push("/");
    });

    newSocket.on("opponentLeft", (data) => {
      alert(data.message);
    });

    newSocket.on("opponentKicked", (data) => {
      alert(data.message);
    });

    newSocket.on("kicked", (message) => {
      alert(message);
      router.push("/");
    });

    newSocket.on("info", (message) => {
      alert(message);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server.");
    });

    return () => {
      newSocket.disconnect();
      clearTimer();
    };
  }, [router]);

  const resetTimer = () => {
    clearTimer();
    setTimeLeft(30); // Reset to 30 seconds

    timerRef.current = setInterval(() => {
      setTimeLeft((prevTimeLeft) => {
        if (prevTimeLeft > 1) {
          return prevTimeLeft - 1;
        } else {
          clearTimer();
          return 0;
        }
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(null);
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (!gameState || !yourColor) {
      return false;
    }

    const isYourTurn = gameState.currentTurnColor === yourColor;

    if (!isYourTurn) {
      return false;
    }

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    };

    const gameCopy = new Chess(game.fen());
    const result = gameCopy.move(move);

    if (result === null) return false; // Invalid move

    // Send move to the server
    if (socket) {
      socket.emit("makeMove", move);
      // The server will send a new gameState, which will reset the timer
    }

    return true;
  };

  const findNewGame = async () => {
    // Make API request to leave the current game and join a new one
    const response = await fetch(
      "http://localhost:3001/leave-and-join-new-game",
      {
        method: "POST",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (data.success) {
      // Reload the page to reinitialize everything
      router.refresh();
    } else {
      alert(data.message || "Error finding a new game");
    }
  };

  if (!gameState || !yourColor) {
    return <div>Loading game...</div>;
  }

  const isYourTurn = gameState.currentTurnColor === yourColor;
  const opponentColor = yourColor === "white" ? "black" : "white";
  const opponent = gameState.players.find((p) => p.color === opponentColor);
  const opponentConnected = opponent !== undefined;

  return (
    <div>
      <h1>Welcome, {yourName}!</h1>
      <h2>You are playing as {yourColor}</h2>
      <h3>Game ID: {gameState.gameId}</h3>
      <p>
        Players:{" "}
        {gameState.players
          .map((p) => `${p.userName} (${p.color})`)
          .join(" vs. ")}
      </p>
      {opponentConnected ? (
        <p>Opponent {opponent.userName} is connected.</p>
      ) : (
        <p>Looking for opponent...</p>
      )}
      {gameState.isOver ? (
        <p>Game Over: {gameState.result}</p>
      ) : !opponentConnected ? (
        <p>Looking for opponent...</p>
      ) : (
        <p>
          {isYourTurn ? "Your turn" : "Opponent's turn"}
          {timeLeft !== null && (
            <>
              {" "}
              - Time left: {timeLeft} second{timeLeft !== 1 ? "s" : ""}
            </>
          )}
        </p>
      )}
      <div className="w-96 h-96">
        <Chessboard
          position={game.fen()}
          onPieceDrop={onDrop}
          boardOrientation={yourColor}
          arePiecesDraggable={isYourTurn}
        />
      </div>
      <button onClick={findNewGame}>Find New Game</button>
    </div>
  );
}
