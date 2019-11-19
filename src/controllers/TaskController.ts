import { Request, Response } from "express";
import mongoose from "mongoose";
import TaskModel, { ITaskModel } from "../models/TaskModel";

import { TASK_VIEW, NOT_LOGGED_IN, NOT_FOUND, PERMISSIONS_FAIL, DELETED_VIEW } from "../views/TaskViews";
import { markAncestorsUncompleted, checkAndCompleteAncestors } from "../utils/taskUtils";

type IControllerFunc = (req: Request, res: Response) => Promise<Response>;

interface IReqLocals {
  task: ITaskModel;
}

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

const showTask: IControllerFunc = async (req, res) => {
  const { task } = req.locals;
  if (!task) throw new Error("You need to call this with taskExists Middleware");
  const result = await populateChildren(task);
  return TASK_VIEW(res, result);
};

const deleteTask: IControllerFunc = async (req, res) => {
  const { task } = req.locals;
  if (!task) throw new Error("You need to call this with taskExists Middleware");
  const { parentTask } = task;
  await task.remove();
  if (parentTask) await checkAndCompleteAncestors(parentTask);
  return DELETED_VIEW(res);
};

const editTask: IControllerFunc = async (req, res) => {
  const { task } = req.locals;
  if (!task) throw new Error("You need to call this with taskExists Middleware");

  const output = (await TaskModel.findOneAndUpdate({ _id: task._id }, req.body, {
    new: true
  }).exec()) as ITaskModel;

  if (req.body.completed === false && task.parentTask) await markAncestorsUncompleted(task.parentTask);
  if (req.body.completed === true && task.parentTask) await checkAndCompleteAncestors(task.parentTask);
  return TASK_VIEW(res, output);
};

export default { createNewTask, showTask, deleteTask, editTask };
