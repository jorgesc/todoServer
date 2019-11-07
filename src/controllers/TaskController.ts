import { Request, Response } from "express";
import mongoose from "mongoose";
import TaskModel, { ITaskModel } from "../models/TaskModel";

import { TASK_VIEW, NOT_LOGGED_IN, NOT_FOUND, PERMISSIONS_FAIL } from "../views/TaskViews";
import { markAncestorsUncompleted, checkAndCompleteAncestors } from "../utils/taskUtils";

type IMiddlewareFunc = (req: Request, res: Response, extra?: any) => any;

const isLoggedIn: IMiddlewareFunc = async (req, res) => {
  if (!req.session || !req.session.userId) return NOT_LOGGED_IN(res);
};

const taskExists: IMiddlewareFunc = async (req, res) => {
  const { taskId } = req.params;
  const task = await TaskModel.findOne({ _id: taskId });
  return task || NOT_FOUND(res);
};

const withMiddleware = (fun: any, middlewares: IMiddlewareFunc[]) => {
  return async (req: Request, res: Response) => {
    for (const m of middlewares) {
      console.log("Testing middleware", m, "of", middlewares);
      const output = await m(req, res);
      console.log("output", typeof output);
      if (output) {
        if (output instanceof Response) return output;
        else return fun(req, res, output);
      }
    }
    return fun(req, res);
  };
};

const createNewTask = async (req: Request, res: Response): Promise<Response> => {
  if (!req.session) throw new Error("You need to call this with isLoggedIn Middleware");
  const { title, description, parentTask } = req.body;
  const { userId } = req.session;
  const task = await new TaskModel({
    title,
    description,
    parentTask,
    createdBy: userId,
    createdOn: new Date(),
    completed: false,
    children: []
  }).save();
  await markAncestorsUncompleted(parentTask);
  return TASK_VIEW(res, task);
};

const showTask = async (req: Request, res: Response): Promise<Response> => {
  const { taskId } = req.params;
  const task = await TaskModel.findOne({ _id: taskId });
  if (!task) return NOT_FOUND(res);
  const childrenTasks = (await TaskModel.find({ parentTask: taskId })).map(doc => {
    const { children, ...rest } = doc.toObject();
    return rest;
  });
  return res.status(200).json({
    status: "ok",
    result: { ...task.toObject(), children: childrenTasks }
  });
};

export default {
  createNewTask: withMiddleware(createNewTask, [isLoggedIn]),

  showTask: withMiddleware(showTask, [isLoggedIn, taskExists]),

  deleteTask: async (req: Request, res: Response): Promise<Response> => {
    const { taskId } = req.params;
    const task = await TaskModel.findOne({ _id: taskId });

    if (!task || !req.session || !task.createdBy.equals(req.session.userId)) return PERMISSIONS_FAIL(res);

    const { parentTask } = task;
    await task.remove();
    if (parentTask) await checkAndCompleteAncestors(parentTask);
    return res.status(204).send();
  },

  editTask: async (req: Request, res: Response): Promise<Response> => {
    const { taskId } = req.params;
    const task = await TaskModel.findOne({ _id: taskId });

    if (!task || !req.session || !task.createdBy.equals(req.session.userId)) return PERMISSIONS_FAIL(res);

    const output = await TaskModel.findOneAndUpdate({ _id: taskId }, req.body, {
      new: true
    }).exec();

    if (req.body.completed === false && task.parentTask) await markAncestorsUncompleted(task.parentTask);
    if (req.body.completed === true && task.parentTask) await checkAndCompleteAncestors(task.parentTask);
    return res.status(200).json({ status: "ok", result: output });
  }
};
