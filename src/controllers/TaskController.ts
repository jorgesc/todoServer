import {Request, Response} from "express";
import mongoose from "mongoose";
import TaskModel, {ITaskModel} from "../models/TaskModel";

const NOT_LOGGED_IN = (res: Response) =>
  res.status(401).json({status: "error", result: "User not logged in"});

const NOT_FOUND = (res: Response) =>
  res.status(404).json({status: "error", result: "Not found"});

const DELETE_FAIL = (r: Response): Response =>
  r.status(401).json({
    status: "error",
    result: "Task doesn't exists or not enough permissions",
  });

const markAncestorsUncompleted = async (id: string): Promise<void> => {
  const next = await TaskModel.findOneAndUpdate({_id: id}, {completed: false});
  if (next && next.parentTask) return markAncestorsUncompleted(next.parentTask);
};

const checkAndCompleteAncestors = async (id: string): Promise<void> => {
  const children = await TaskModel.find({parentTask: id});
  if (!children.every(c => c.completed)) return;
  const curr = await TaskModel.findOne({_id: id});
  if (!curr) throw new Error(`Task with id: ${id} not found on database`);
  curr.completed = true;
  await curr.save();
  const {parentTask} = curr;
  if (parentTask) return await checkAndCompleteAncestors(parentTask);
};

export default {
  createNewTask: async (req: Request, res: Response): Promise<Response> => {
    if (!req.session || !req.session.userId) return NOT_LOGGED_IN(res);

    const {title, description, parentTask} = req.body;
    const taskData = {
      title,
      description,
      parentTask,
      createdBy: req.session.userId,
      createdOn: new Date(),
      completed: false,
      children: [],
    };

    const task = new TaskModel(taskData);
    const result = await task.save();

    markAncestorsUncompleted(parentTask);

    return res.status(201).json({status: "ok", result});
  },

  showTask: async (req: Request, res: Response): Promise<Response> => {
    if (!req.session || !req.session.userId) return NOT_LOGGED_IN(res);
    const {taskId} = req.params;
    const task = await TaskModel.findOne({_id: taskId});
    if (!task) return NOT_FOUND(res);
    const childrenTasks = (await TaskModel.find({parentTask: taskId})).map(
      doc => {
        const {children, ...rest} = doc.toObject();
        return rest;
      },
    );
    return res.status(200).json({
      status: "ok",
      result: {...task.toObject(), children: childrenTasks},
    });
  },

  deleteTask: async (req: Request, res: Response): Promise<Response> => {
    const {taskId} = req.params;
    const task = await TaskModel.findOne({_id: taskId});

    if (!task || !req.session) return DELETE_FAIL(res);
    if (!task.createdBy.equals(req.session.userId)) return DELETE_FAIL(res);

    const {parentTask} = task;

    await task.remove();

    if (parentTask) await checkAndCompleteAncestors(parentTask);
    return res.status(204).send();
  },

  editTask: async (req: Request, res: Response): Promise<Response> => {
    const {taskId} = req.params;
    const task = await TaskModel.findOne({_id: taskId});
    if (!task || !req.session) return DELETE_FAIL(res);
    if (!task.createdBy.equals(req.session.userId)) return DELETE_FAIL(res);
    const output = await TaskModel.findOneAndUpdate({_id: taskId}, req.body, {
      new: true,
    }).exec();
    return res.status(200).json({status: "ok", result: output});
  },
};
