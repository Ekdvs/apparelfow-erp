import jwt, {
  JsonWebTokenError,
  TokenExpiredError,
} from "jsonwebtoken";

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export const generateAccessToken = (
  payload: AccessTokenPayload,
): string =>{
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET!,
    {
      expiresIn: "30m",
    },
  );
}

export const verifyAccessToken = (
  token: string,
): AccessTokenPayload =>{
  return jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET!,
  ) as AccessTokenPayload;
}

export const isTokenExpired = (error: unknown): boolean => {
  return error instanceof TokenExpiredError;
}

export const isInvalidToken = (error: unknown): boolean => {
  return error instanceof JsonWebTokenError;
}