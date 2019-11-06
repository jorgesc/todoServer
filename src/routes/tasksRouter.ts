import {Router, Request, Response} from "express";
import TaskController from "../controllers/TaskController";

const router = Router();
router.post("/", TaskController.createNewTask);

export default router;
