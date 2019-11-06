import {Request, Response} from "express";
import mongoose from "mongoose";
import TaskModel from "../models/TaskModel";

const NOT_LOGGED_IN = (res: Response) =>
  res.status(401).json({status: "error", result: "User not logged in"});

const NOT_FOUND = (res: Response) =>
  res.status(404).json({status: "error", result: "Not found"});

const markAncestorsUncompleted = async (id: string): Promise<void> => {
  const next = await TaskModel.findOneAndUpdate({_id: id}, {completed: false});
  if (next && next.parentTask) return markAncestorsUncompleted(next.parentTask);
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
};
