"use client";
import { useEffect, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import { UserContext } from "../context/UserContext";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

export default function GamePage() {
  const { userName } = useContext(UserContext);
  const router = useRouter();
  const [gameState, setGameState] = useState(null);
  const [socket, setSocket] = useState(null);
  const [game, setGame] = useState(new Chess());

  useEffect(() => {
    if (!userName) {
      router.push("/");
      return;
    }

    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    newSocket.emit("joinUserGame", { userName });

    newSocket.on("gameState", (state) => {
      setGameState(state);

      const newGame = new Chess();
      state.moves.forEach((move) => {
        newGame.move(move);
      });
      setGame(newGame);
    });

    newSocket.on("error", (message) => {
      alert(message);
      router.push("/");
    });

    return () => {
      newSocket.disconnect();
    };
  }, [userName]);

  const onDrop = (sourceSquare, targetSquare) => {
    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (move === null) return false;

    setGame(new Chess(game.fen()));

    if (socket) {
      socket.emit("makeMove", move.san);
    }

    return true;
  };

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  return (
    <div>
      <h1>Game ID: {gameState.gameId}</h1>
      <p>Players: {gameState.players.join(" vs. ")}</p>
      <div className="w-96 h-96">
        <Chessboard position={game.fen()} onPieceDrop={onDrop} />
      </div>
    </div>
  );
}
