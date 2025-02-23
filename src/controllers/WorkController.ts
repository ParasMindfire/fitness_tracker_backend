import { Request, Response, NextFunction } from "express";
import { format } from "date-fns";
import * as workoutRepo from "../repository/WorkoutRepo";
import { BadRequestError } from "../errors/BadRequest";
import { NotFoundError } from "../errors/NotFound";
import { ConflictError } from "../errors/ConflictError";

//Fetch all workouts from the database.
const getAllWorkoutByAll = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {

        const workouts = await workoutRepo.getAllWorkouts();

        if (!workouts.length) {
            throw new NotFoundError("No Data To Show in Workouts");
        }

        return res.status(200).json(workouts);
    } catch (error) {
        next(error);
    }
};

//Fetch all workouts for a specific user.
const getAllWorkoutByUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = (req as any).auth;
        const workouts = await workoutRepo.getWorkoutsByUser(id);

        if (!workouts.length) {
            throw new NotFoundError("No Data To Show in Workouts By User");
        }

        return res.status(200).json(workouts);
    } catch (error) {
        next(error);
    }
};

//Create a new workout entry for a user.
const createWorkout = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {

        const { id } = (req as any).auth;
        const { exercise_type, duration, calories_burned, workout_date } = req.body;

        if (!exercise_type || !duration || !calories_burned || !workout_date) {
            throw new BadRequestError("Enter All The Fields");
        }

        const existingExercise = await workoutRepo.findWorkout(id, workout_date, exercise_type);

        if (existingExercise.length > 0) {
            throw new ConflictError("You have already added this exercise today");
        }

        await workoutRepo.createWorkout(id, exercise_type, duration, calories_burned, workout_date);

        return res.status(201).json({ status: 200, message: "Workout Added Successfully" });
    } catch (error) {
        next(error);
    }
};

//Fetch a single workout entry by its ID.
const getSingleWorkout = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { workout_id } = req.params;

        if (!workout_id) {
            throw new BadRequestError("Workout ID is required");
        }

        const workout = await workoutRepo.getWorkoutById(parseInt(workout_id));

        if (!workout.length) {
            throw new NotFoundError(`Workout with workout_id=${workout_id} was not found`);
        }

        return res.status(200).json(workout[0]);
    } catch (error) {
        next(error);
    }
};

//Update an existing workout entry.
const updateWorkout = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {

        const { id } = (req as any).auth;
        const { workout_id, exercise_type, duration, calories_burned, workout_date } = req.body;

        if (!workout_id || !exercise_type || !duration || !calories_burned || !workout_date) {
            throw new BadRequestError("Enter All The Fields");
        }

        const formattedDate = format(new Date(workout_date), "yyyy-MM-dd");

        await workoutRepo.updateWorkout(id, workout_id, exercise_type, duration, calories_burned, formattedDate);

        return res.status(200).json({ message: "Workout Updated Successfully" });
    } catch (error) {
        next(error);
    }
};

//Delete a workout entry by its ID.
const deleteWorkout = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {

        const { id } = (req as any).auth;
        const { workout_id } = req.body;

        if (!workout_id) {
            throw new BadRequestError("Workout ID is required");
        }

        await workoutRepo.deleteWorkout(id, workout_id);

        return res.status(200).json({ status: 200, message: "Workout Deleted Successfully" });
    } catch (error) {
        next(error);
    }
};


// Fetch current workout streak for a user
const getWorkoutStreak = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = (req as any).auth;
        console.log("id ", id);

        const workouts = await workoutRepo.getWorkoutsByUser(id);

        if (!workouts.length) return res.status(200).json({ streak: 0 });

        // Sort workouts by date (ascending)
        const sortedWorkouts = workouts.sort((a: any, b: any) => 
            new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
        );

        let streak = 0;

        // Set today's date to midnight for accurate day difference
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Start from the latest workout
        for (let i = sortedWorkouts.length - 1; i >= 0; i--) {
            const workoutDate = new Date(sortedWorkouts[i].workout_date);
            workoutDate.setHours(0, 0, 0, 0); // Normalize workout date

            const diffDays = Math.floor((today.getTime() - workoutDate.getTime()) / (1000 * 3600 * 24));

            if (diffDays === 0 || diffDays === streak) {
                streak++;
            } else if (diffDays > streak) {
                break;
            }
        }

        return res.status(200).json({ streak });
    } catch (error) {
        next(error);
    }
};


// Fetch workouts for a specific month
const getMonthlyWorkouts = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = (req as any).auth;
        const { year, month } = req.query;

        console.log("year", year);

        const startDate = new Date(`${year}-${month}-01`);
        const endDate = new Date(
            Number(year ?? new Date().getFullYear()), 
            Number(month ?? new Date().getMonth() + 1), 
            0
        );

        const workouts = await workoutRepo.getWorkoutsByUser(id);

        const monthlyWorkouts = workouts
            .filter((workout: { workout_date: string | number | Date; }) => {
                const workoutDate = new Date(workout.workout_date);
                return workoutDate >= startDate && workoutDate <= endDate;
            })
            .map((workout: any) => ({
                ...workout,
                workout_date: new Date(workout.workout_date).toISOString().split('T')[0] // Format to yyyy-mm-dd
            }));

        return res.status(200).json(monthlyWorkouts);
    } catch (error) {
        next(error);
    }
};



export { getAllWorkoutByAll, createWorkout, getSingleWorkout, updateWorkout, deleteWorkout, getAllWorkoutByUser,getWorkoutStreak, getMonthlyWorkouts };

