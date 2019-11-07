import { Request, Response } from "express";
import mongoose from "mongoose";
import TaskModel, { ITaskModel } from "../models/TaskModel";

import { TASK_VIEW, NOT_LOGGED_IN, NOT_FOUND, PERMISSIONS_FAIL, DELETED_VIEW } from "../views/TaskViews";
import { markAncestorsUncompleted, checkAndCompleteAncestors } from "../utils/taskUtils";

import withMiddleware, { IExtra, isLoggedIn, taskExists, hasPermission } from "./middlewares";

type IControllerFunc = (req: Request, res: Response, extra: IExtra) => Promise<Response>;

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

const showTask: IControllerFunc = async (req, res, extra) => {
  const { task } = extra;
  if (!task) throw new Error("You need to call this with taskExists Middleware");
  const childrenTasks = (await TaskModel.find({ parentTask: task._id })).map(doc => {
    const { children, ...rest } = doc.toObject();
    return rest;
  });
  const result = { ...task.toObject(), children: childrenTasks };
  return TASK_VIEW(res, result);
};

const deleteTask: IControllerFunc = async (req, res, extra) => {
  const { task } = extra;
  if (!task) throw new Error("You need to call this with taskExists Middleware");
  const { parentTask } = task;
  await task.remove();
  if (parentTask) await checkAndCompleteAncestors(parentTask);
  return DELETED_VIEW(res);
};

const editTask: IControllerFunc = async (req, res, extra) => {
  const { task } = extra;
  if (!task) throw new Error("You need to call this with taskExists Middleware");

  const output = (await TaskModel.findOneAndUpdate({ _id: task._id }, req.body, {
    new: true
  }).exec()) as ITaskModel;

  if (req.body.completed === false && task.parentTask) await markAncestorsUncompleted(task.parentTask);
  if (req.body.completed === true && task.parentTask) await checkAndCompleteAncestors(task.parentTask);
  return TASK_VIEW(res, output);
};

export default {
  createNewTask: withMiddleware(createNewTask, [isLoggedIn]),
  showTask: withMiddleware(showTask, [isLoggedIn, taskExists]),
  deleteTask: withMiddleware(deleteTask, [isLoggedIn, taskExists, hasPermission]),
  editTask: withMiddleware(editTask, [isLoggedIn, taskExists, hasPermission])
};
