import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "mydefaulyjwtsecret";

/**
 * Verifies the JWT token from the request cookies.
 * @param {Request} req - The incoming Next.js request object.
 * @returns {Object|null} - The decoded user payload or null if invalid.
 */
export async function getAuthUser(req) {
  // Requirement 48: Authentication must be implemented using JWT [cite: 48]
  const token = req.cookies.get("token")?.value;
  
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // Returns { email, role, name, ... }
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return null;
  }
}

/**
 * Checks if the authenticated user has the ADMIN role.
 * @param {Object} user - The user object returned from getAuthUser.
 * @returns {boolean}
 */
export function isAdmin(user) {
  // Requirement 59 & 71: Only ADMIN users are allowed specific operations [cite: 59, 71]
  return user && user.role === "ADMIN";
}

/**
 * Checks if the authenticated user has the USER role.
 * @param {Object} user - The user object returned from getAuthUser.
 * @returns {boolean}
 */
export function isUser(user) {
  // Requirement 58: System distinguishes USER type [cite: 58]
  return user && user.role === "USER";
}