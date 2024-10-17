import { NextResponse } from "next/server";

export async function POST(request) {
  const { userName } = await request.json();

  try {
    const response = await fetch("http://10.0.0.208:3001/join-random-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName }),
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error joining game:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
