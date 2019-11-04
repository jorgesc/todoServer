import {Router, Request, Response} from "express";
import tasksRouter from "./tasksRouter";

const router = Router();
router.use("/tasks", tasksRouter);

export default router;
