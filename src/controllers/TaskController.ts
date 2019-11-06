import {Request, Response} from "express";
import TaskModel from "../models/TaskModel";

const NOT_LOGGED_IN = (res: Response) =>
  res.status(401).json({status: "error", result: "User not logged in"});

export default {
  createNewTask: async (req: Request, res: Response): Promise<Response> => {
    if (!req.session || !req.session.userId) return NOT_LOGGED_IN(res);

    const {title, description} = req.body;
    const taskData = {
      title,
      description,
      createdBy: req.session.userId,
      createdOn: new Date(),
      completed: false,
      children: [],
    };

    const task = new TaskModel(taskData);
    return res.status(201).json({status: "ok", result: await task.save()});
  },
};
