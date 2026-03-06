const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

const corsHeaders = {
  "Access-Control-Allow-Credentials": "true",
  // DO NOT use '*' when sending credentials; must use the exact origin
  "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default corsHeaders;