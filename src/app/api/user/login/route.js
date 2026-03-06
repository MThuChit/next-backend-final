import { getClientPromise } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import corsHeaders from "@/lib/cors";

const JWT_SECRET = process.env.JWT_SECRET || "mydefaulyjwtsecret";

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { email, password } = data;

    // 1. Basic Validation [cite: 125]
    if (!email || !password) {
      return NextResponse.json({ message: "Missing email or password" }, { status: 400, headers: corsHeaders });
    }

    // 2. Hardcoded Test Users as per Exam Instructions [cite: 51, 54, 55]
    let user = null;
    if (email === "admin@test.com" && password === "admin123") {
      user = { email: "admin@test.com", role: "ADMIN", name: "Administrator" };
    } else if (email === "user@test.com" && password === "user123") {
      user = { email: "user@test.com", role: "USER", name: "Normal User" };
    }

    // 3. Optional: Fallback to MongoDB if you have registered users there
    if (!user) {
      const client = await getClientPromise();
      const db = client.db("library_db"); // Ensure this matches your DB name
      const dbUser = await db.collection("users").findOne({ email });
      
      // Note: In a real exam scenario, stick to the provided test users first [cite: 51]
      if (dbUser && password === dbUser.password) { // Use bcrypt.compare if passwords are hashed
        user = { email: dbUser.email, role: dbUser.role || "USER", id: dbUser._id };
      }
    }

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401, headers: corsHeaders });
    }

    // 4. Generate JWT including the Role [cite: 48, 56]
    const token = jwt.sign(
      {
        email: user.email,
        role: user.role, // Crucial for role-based authorization [cite: 149]
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 5. Create Response and set Cookie 
    const response = NextResponse.json(
      { 
        message: "Login successful",
        user: { email: user.email, role: user.role } 
      },
      { status: 200, headers: corsHeaders }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 3600, // 1 hour for exam duration
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500, headers: corsHeaders });
  }
}