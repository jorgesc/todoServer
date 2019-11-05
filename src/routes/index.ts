import {Router, Request, Response} from "express";
import tasksRouter from "./tasksRouter";
import usersRouter from "./usersRouter";

const router = Router();
router.use("/tasks", tasksRouter);
router.use("/users", usersRouter);

export default router;
