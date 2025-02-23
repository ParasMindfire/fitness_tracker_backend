import { Request,Response,NextFunction } from "express";
import jwt from "jsonwebtoken"


// Middleware for authorization
const authorisation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader: any = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new Error("Token not provided properly");
        }
        const token = authHeader.split(" ")[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
            (req as any).auth = decoded;
            next();
        } catch (error) {
            throw new Error("Invalid or expired token");
        }
    } catch (error) {
        next(error);
    }
};

export default authorisation;