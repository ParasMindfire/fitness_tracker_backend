import { StatusCodes } from 'http-status-codes';
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { CustomError } from '../errors';

// Middleware for handling errors
export const ErrorHandler:ErrorRequestHandler= (err, req: Request, res: Response, next: NextFunction) => {
  // Define a custom error object with default values
  if (err instanceof CustomError) {
    res.status(err.statusCode).json({ msg: err.message });
    return;
  }

  // Handle specific status codes if not a CustomError
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Something went wrong, try again later';

  // Log unexpected errors for debugging
  if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
    console.error('Internal Server Error:', err);
  }

  // Send the response
  res.status(statusCode).json({ msg: message });

  return;
};

