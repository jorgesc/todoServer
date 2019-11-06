import {Request, Response} from "express";
import TaskModel from "../models/TaskModel";

export default {
  createNewTask: async (req: Request, res: Response): Promise<Response> => {
    const task = new TaskModel(req.body);
    task.createdBy = req.session.userId;
    task.createdOn = new Date();
    task.completed = false;
    task.children = [];
    return res.status(201).json({status: "ok", result: await task.save()});
  },
};
