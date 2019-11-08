import { Request, Response } from "express";
import TaskModel, { ITaskModel } from "../models/TaskModel";
import { TASK_VIEW, NOT_LOGGED_IN, NOT_FOUND, PERMISSIONS_FAIL } from "../views/TaskViews";

export type IMiddleware = (req: Request, res: Response, next: () => void) => Promise<Response | void>;

export const isLoggedIn: IMiddleware = async (req, res, next) => {
  if (!req.session || !req.session.userId) return NOT_LOGGED_IN(res);
  return next();
};

export const taskExists: IMiddleware = async (req, res, next) => {
  const { taskId } = req.params;
  const task = await TaskModel.findOne({ _id: taskId });
  if (!task) return PERMISSIONS_FAIL(res);
  req.locals = { task };
  return next();
};

export const hasPermission: IMiddleware = async (req, res, next) => {
  const task = req.locals.task ? req.locals.task : await TaskModel.findOne({ _id: req.body.taskId }).exec();
  if (!task || !req.session || !task.createdBy.equals(req.session.userId)) return PERMISSIONS_FAIL(res);
  req.locals = { task };
  return next();
};
