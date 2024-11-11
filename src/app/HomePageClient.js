"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HomePageClient({ userName }) {
  const [nameInput, setNameInput] = useState("");
  const [sessionName, setSessionName] = useState(userName);
  const router = useRouter();

  const handleJoinGame = async () => {
    if (!sessionName) {
      alert("Please set your name before joining a game");
      return;
    }

    const response = await fetch(
      "http://localhost:3001/leave-and-join-new-game",
      {
        method: "POST",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (data && data.success) {
      router.push("/game");
    } else {
      alert(data.message || "Error joining game");
    }
  };

  const handleSetName = async () => {
    if (!nameInput.trim()) {
      alert("Please enter a valid name");
      return;
    }

    const response = await fetch("http://localhost:3001/set-name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userName: nameInput.trim() }),
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      setSessionName(nameInput.trim());
      setNameInput(""); // Clear the input field
    } else {
      alert("Error setting name");
    }
  };

  return (
    <div className="flex flex-col items-center h-screen p-2">
      <div className="max-w-md w-full flex flex-col gap-4">
        <h1 className="text-center text-2xl font-bold">Chesslemania</h1>
        {sessionName ? (
          <h2>Your Name: {sessionName}</h2>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              type="text"
              placeholder="Enter your name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <Button onClick={handleSetName}>Set Name</Button>
          </div>
        )}
        <Button onClick={handleJoinGame} disabled={!sessionName}>
          Join Game
        </Button>
      </div>
    </div>
  );
}
