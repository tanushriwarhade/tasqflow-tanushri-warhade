import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthTokenPayload {
  id: string;
  email: string;
  name: string;
}

export interface CustomIncomingRequest extends Request {
  user?: AuthTokenPayload;
}

export function authenticateToken(req: CustomIncomingRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token is required" });
  }

  const secret = process.env.JWT_SECRET || "fallback_security_jwt_secret";

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Access token is invalid or expired" });
    }
    req.user = decoded as AuthTokenPayload;
    next();
  });
}
