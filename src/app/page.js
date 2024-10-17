"use client";
import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { UserContext } from "./context/UserContext";

export default function HomePage() {
  const { userName, setUserName } = useContext(UserContext);
  const [nameInput, setNameInput] = useState("");
  const router = useRouter();

  const handleSetName = () => {
    if (nameInput.trim() === "") {
      alert("Please enter a valid name.");
      return;
    }
    setUserName(nameInput.trim());
    setNameInput("");
  };

  const handleJoinGame = async () => {
    if (!userName) {
      alert("Please set your name first.");
      return;
    }

    // Call the API route to join a random game
    const response = await fetch("/api/join-random-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName }),
    });

    const data = await response.json();

    if (data.success) {
      // Redirect to the game page
      router.push("/game");
    } else {
      alert("Error joining game.");
    }
  };

  return (
    <div>
      <h1>Welcome to the Chess Game</h1>
      <div>
        <input
          type="text"
          placeholder="Enter your name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
        />
        <button onClick={handleSetName}>Set Name</button>
      </div>
      {userName && <p>Your name: {userName}</p>}
      <button onClick={handleJoinGame}>Join Random Game</button>
    </div>
  );
}
