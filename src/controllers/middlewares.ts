import { Request, Response } from "express";
import TaskModel, { ITaskModel } from "../models/TaskModel";
import { TASK_VIEW, NOT_LOGGED_IN, NOT_FOUND, PERMISSIONS_FAIL } from "../views/TaskViews";

export interface IExtra {
  task?: ITaskModel;
}

export type IMiddlewareFunc = (req: Request, res: Response, extra: IExtra) => any;

export const isLoggedIn: IMiddlewareFunc = async (req, res, extra) => {
  if (!req.session || !req.session.userId) return NOT_LOGGED_IN(res);
};

export const taskExists: IMiddlewareFunc = async (req, res, extra) => {
  const { taskId } = req.params;
  const task = await TaskModel.findOne({ _id: taskId });
  if (!task) return PERMISSIONS_FAIL(res);
  extra.task = task;
};

export const hasPermission: IMiddlewareFunc = async (req, res, extra) => {
  const task = extra.task ? extra.task : await TaskModel.findOne({ _id: req.body.taskId }).exec();
  if (!task || !req.session || !task.createdBy.equals(req.session.userId)) return PERMISSIONS_FAIL(res);
  extra.task = task;
};

export default (fun: IMiddlewareFunc, middlewares: IMiddlewareFunc[]) => {
  return async (req: Request, res: Response) => {
    const extraStuff = {};

    for (const m of middlewares) {
      const output = await m(req, res, extraStuff);
      if (output) return output;
    }
    return fun(req, res, extraStuff);
  };
};
