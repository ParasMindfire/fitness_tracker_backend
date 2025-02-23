import { Request, Response, NextFunction } from "express";
import * as fitnessGoalsRepo from "../repository/FitnessRep";
import { BadRequestError } from "../errors/BadRequest";
import { NotFoundError } from "../errors/NotFound";
import cron from "node-cron";
import { sendEmail } from "../services/nodeMailer";

// Fetch all fitness goals for the authenticated user
const getAllFitnessGoals = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } =  (req as any).auth;
        const fitnessGoals = await fitnessGoalsRepo.getAllFitnessGoals(id);

        if (!fitnessGoals.length) {
            throw new NotFoundError("There is no data to show in your goals");
        }

        return res.status(200).json(fitnessGoals);
    } catch (error) {
        next(error);
    }
};

// Create a new fitness goal for the authenticated user
const createFitnessGoal = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } =  (req as any).auth;
        const { goal_type, target_value, current_progress, start_date, end_date } = req.body;

        if (!goal_type || !target_value || !current_progress || !start_date || !end_date) {
            throw new BadRequestError("Enter All The Fields");
        }

        await fitnessGoalsRepo.createFitnessGoal(id, goal_type, target_value, current_progress, start_date, end_date);

        return res.status(201).json({ message: "Fitness goal created successfully" });
    } catch (error) {
        next(error);
    }
};

// Get details of a single fitness goal
const getSingleFitnessGoal = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { goal_id } = req.params;

        if (!goal_id) {
            throw new BadRequestError("Goal ID is required");
        }

        const goal = await fitnessGoalsRepo.getSingleFitnessGoal(parseInt(goal_id));

        if (!goal.length) {
            throw new NotFoundError(`Goal with goal_id=${goal_id} was not found`);
        }

        return res.status(200).json(goal[0]);
    } catch (error) {
        next(error);
    }
};

// Update an existing fitness goal
const updateFitnessGoal = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { goal_id, target_value, current_progress, status } = req.body;

        if (!goal_id || !target_value || !current_progress || !status) {
            throw new BadRequestError("Enter All The Fields");
        }

        await fitnessGoalsRepo.updateFitnessGoal(goal_id, target_value, current_progress, status);

        return res.status(200).json({ message: "Fitness goal updated successfully" });
    } catch (error) {
        next(error);
    }
};

// Delete a fitness goal
const deleteFitnessGoal = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const { id } = req.params;

        if (!id) {
            throw new BadRequestError("Goal ID is required");
        }

        await fitnessGoalsRepo.deleteFitnessGoal(parseInt(id));

        return res.status(200).json({ message: "Fitness goal deleted successfully" });
    } catch (error) {
        next(error);
    }
};

// Cron Job: Send reminder emails 24 hours before end_date
cron.schedule("0 * * * *", async () => { // Runs every hour
    try {
        const allGoals:any = await fitnessGoalsRepo.getAllFitnesswithUsername(); // Fetch all fitness goals

        const now = new Date();
        allGoals.forEach(async (goal:any) => {
            const endDate = new Date(goal.end_date);
            const timeDiff = endDate.getTime() - now.getTime();
            const hoursLeft = timeDiff / (1000 * 60 * 60);

            if (goal.status === "pending" && hoursLeft <= 24 && hoursLeft > 23) {
                await sendEmail(
                    "Fitness App",
                    goal.name,
                    goal.email,
                    "Your current progress is: " + goal.current_progress
                );
                console.log(`Reminder email sent to ${goal.user_email}`);
            }
        });
    } catch (error) {
        console.error("Error sending reminder emails:", error);
    }
});

export { getAllFitnessGoals, createFitnessGoal, getSingleFitnessGoal, updateFitnessGoal, deleteFitnessGoal };
