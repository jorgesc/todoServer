import { Request, Response } from "express";
import mongoose from "mongoose";
import TaskModel, { ITaskModel } from "../models/TaskModel";

import { TASK_VIEW, NOT_LOGGED_IN, NOT_FOUND, PERMISSIONS_FAIL, DELETED_VIEW } from "../views/TaskViews";
import { markAncestorsUncompleted, checkAndCompleteAncestors } from "../utils/taskUtils";

type IControllerFunc = (req: Request, res: Response, task: ITaskModel) => Promise<Response>;

interface IReqLocals {
  task: ITaskModel;
}

const deconstructTaskVar = (f: any) => {
  const inner = (req: Request, res: Response) => {
    const { task } = req.locals;
    if (!task) throw new Error("You need to call this with taskExists Middleware");
    return f(req, res, task);
  };
  return inner;
};

const createNewTask: IControllerFunc = async (req, res) => {
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

const populateChildren = async (task: ITaskModel): Promise<ITaskModel> => {
  const { children, ...rest } = task.toObject();
  const foundChildren = await TaskModel.find({ parentTask: task._id });
  const expandedChildren = await Promise.all(foundChildren.map(async c => await populateChildren(c)));
  return { ...rest, children: expandedChildren };
};

const showTask: IControllerFunc = async (req, res, task) => {
  const result = await populateChildren(task);
  return TASK_VIEW(res, result);
};

const deleteTask: IControllerFunc = async (req, res, task) => {
  const { parentTask } = task;
  await task.remove();
  if (parentTask) await checkAndCompleteAncestors(parentTask);
  return DELETED_VIEW(res);
};

const editTask: IControllerFunc = async (req, res, task) => {
  const output = (await TaskModel.findOneAndUpdate({ _id: task._id }, req.body, {
    new: true
  }).exec()) as ITaskModel;

  if (req.body.completed === false && task.parentTask) await markAncestorsUncompleted(task.parentTask);
  if (req.body.completed === true && task.parentTask) await checkAndCompleteAncestors(task.parentTask);
  return TASK_VIEW(res, output);
};

export default {
  createNewTask,
  showTask: deconstructTaskVar(showTask),
  deleteTask: deconstructTaskVar(deleteTask),
  editTask: deconstructTaskVar(editTask)
};
