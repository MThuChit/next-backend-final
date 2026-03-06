import { NextResponse } from "next/server";

// Ensure these headers allow the frontend to clear credentials
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:5173",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true", // Required to manipulate cookies
};

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST() {
  // Requirement 6: POST/api/user/logout implementation 
  const response = NextResponse.json({
    message: "Logout successful"
  }, {
    status: 200,
    headers: corsHeaders
  });

  // Clear the JWT cookie by setting maxAge to 0 [cite: 48]
  response.cookies.set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0, 
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}