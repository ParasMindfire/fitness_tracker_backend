import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import * as UserRespository from "../repository/UserRepository";
import { BadRequestError } from "../errors/BadRequest";
import { NotFoundError } from "../errors/NotFound";
import { ConflictError } from "../errors/ConflictError";
import { UnauthorizedError } from "../errors/Unauthorized";
import multer from 'multer';
import path from 'path';
dotenv.config();

// Retrieve all users from the database
export const getAllUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const [users] = await UserRespository.getAllUsers();
        if (!users.length) {
            throw new NotFoundError("No Data To Show in Users");
        }
        return res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};

// Register a new user
export const signupUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { name, email, password, phone, address } = req.body;
        if (!name || !email || !password || !phone || !address) {
            throw new BadRequestError("Enter All The Fields");
        }

        const [existingUser] = await UserRespository.getUserByEmail(email);
        console.log("exisiting user",existingUser);
        if (existingUser.length > 0) {
            throw new ConflictError("User with this email already exists");
        }

        const salt = bcrypt.genSaltSync(10);
        const hashed_password = bcrypt.hashSync(password, salt);

        await UserRespository.insertUser(name, email, hashed_password, phone, address);
        return res.status(201).json({ status: 200, message: "Person Added Successfully" });
    } catch (error) {
        next(error);
    }
};

// Authenticate a user and generate a JWT token
export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            throw new BadRequestError("Enter All The Fields");
        }

        const [user]: any = await UserRespository.getUserByEmail(email);
        if (user.length === 0) {
            throw new NotFoundError("Enter Correct Email");
        }

        const validPassword = bcrypt.compareSync(password, user[0].password);
        if (!validPassword) {
            throw new UnauthorizedError("Invalid Credentials");
        }

        // Generate Access Token (expires in 15 minutes)
        const accessToken = jwt.sign(
            { id: user[0].user_id, email: user[0].email },
            process.env.JWT_SECRET as string,
            { expiresIn: "15m" }
        );

        // Generate Refresh Token (expires in 7 days) using a separate secret if desired
        const refreshToken = jwt.sign(
            { id: user[0].user_id, email: user[0].email },
            process.env.JWT_REFRESH_SECRET as string,
            { expiresIn: "7d" }
        );

        return res.status(200).json({ 
            status: 200, 
            message: "Log in successfully", 
            accessToken, 
            refreshToken, 
            user 
        });
    } catch (error) {
        next(error);
    }
};


// Retrieve a single user by their ID
export const getSingleUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const id = req.params.id;
        if (!id) {
            throw new BadRequestError("ID is not sent in URL");
        }

        const user: any = await UserRespository.getUserById(Number(id));
        if (user.length === 0) {
            throw new NotFoundError(`User was not found with given ID`);
        }

        return res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

// Update the password of an existing user
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { email } = (req as any).auth;
        const { newPassword } = req.body;

        if (!newPassword) {
            throw new BadRequestError("New Password was not entered");
        }

        const [user]: any = await UserRespository.getUserByEmail(email);
        if (!user.length) {
            throw new NotFoundError("User not found");
        }

        console.log("user ",user);

        const oldPassword: any = user[0].password;
        if (bcrypt.compareSync(newPassword, oldPassword)) {
            throw new BadRequestError("Old Password and New Password cannot be the same");
        }

        const salt = bcrypt.genSaltSync(10);
        const hashed_newPassword = bcrypt.hashSync(newPassword, salt);
        await UserRespository.updateUserPassword(email, hashed_newPassword);

        return res.status(200).json({ message: "New Password updated successfully" });
    } catch (error) {
        next(error);
    }
};

// Delete a user from the system
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { email } = req.body;
        const [user] = await UserRespository.getUserByEmail(email);
        if (!user.length) {
            throw new NotFoundError("The person to delete was not found");
        }

        await UserRespository.deleteUserByEmail(email);
        return res.status(200).json({ message: "Person was deleted successfully" });
    } catch (error) {
        next(error);
    }
};


export const getUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { email } = (req as any).auth;

        const [user] = await UserRespository.getUserByEmail(email);
        if (!user) throw new NotFoundError("User not found");

        return res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};




// -------------------
// API to upload photo
// -------------------
export const uploadProfilePhoto = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        console.log("File received:", req.file);
        console.log("Request body:", req.body);

        const { email } = req.body;
        const profilePic = req.file?.filename;

        console.log("email aya yahan controller mai",email);

        if (!profilePic) {
            throw new BadRequestError("No file uploaded");
        }

        await UserRespository.updateUserProfilePic(email, profilePic);

        return res.status(200).json({ message: "Profile photo updated", profilePic });
    } catch (error) {
        next(error);
    }
};


export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new BadRequestError("Refresh token not provided");
        }

        // Verify refresh token using the refresh secret
        const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string);

        // Generate a new access token
        const newAccessToken = jwt.sign(
            { id: decoded.id, email: decoded.email },
            process.env.JWT_SECRET as string,
            { expiresIn: "15m" }
        );

        return res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        next(error);
    }
};






