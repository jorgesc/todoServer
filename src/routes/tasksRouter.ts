import { Router, Request, Response } from "express";
import TaskController from "../controllers/TaskController";

import { isLoggedIn, taskExists, hasPermission } from "../controllers/middlewares";

const router = Router();
router.get("/:taskId([a-f0-9]{24}$)", [isLoggedIn, taskExists], TaskController.showTask);
router.delete("/:taskId([a-f0-9]{24}$)", [isLoggedIn, taskExists, hasPermission], TaskController.deleteTask);
router.put("/:taskId([a-f0-9]{24}$)", [isLoggedIn, taskExists, hasPermission], TaskController.editTask);
router.post("/", [isLoggedIn], TaskController.createNewTask);

export default router;
