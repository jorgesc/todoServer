import {Router, Request, Response} from "express";
import TaskController from "../controllers/TaskController";

const router = Router();
router.get("/:taskId([a-f0-9]{24}$)", TaskController.showTask);
router.delete("/:taskId([a-f0-9]{24}$)", TaskController.deleteTask);
router.post("/", TaskController.createNewTask);

export default router;
