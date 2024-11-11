// pages/index.js (or wherever your HomePage component is located)
import HomePageClient from "./HomePageClient";
import { cookies } from "next/headers";

export default async function HomePage() {
  const userName = await getUsername();
  return <HomePageClient userName={userName} />;
}

async function getUsername() {
  // Get cookies from the incoming request
  const cookieStore = cookies();
  const sessionCookieName = "connect.sid"; // Replace with your actual session cookie name
  const sessionCookieValue = cookieStore.get(sessionCookieName)?.value;

  if (!sessionCookieValue) {
    // No session cookie found
    return null;
  }

  // Build the cookie header
  const cookieHeader = `${sessionCookieName}=${sessionCookieValue}`;

  // Fetch the userName from the game server
  const res = await fetch("http://localhost:3001/get-name", {
    method: "GET",
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  const data = await res.json();
  console.log(data);

  if (data.success && data.userName) {
    return data.userName;
  } else {
    return null;
  }
}
