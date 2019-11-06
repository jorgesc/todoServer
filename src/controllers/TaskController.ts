import {Request, Response} from "express";
import mongoose from "mongoose";
import TaskModel from "../models/TaskModel";

const NOT_LOGGED_IN = (res: Response) =>
  res.status(401).json({status: "error", result: "User not logged in"});

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
};
