import { Response } from "express";
import { ITaskModel } from "../models/TaskModel";

const success = { status: "ok", result: "" };
const error = { status: "error", result: "" };

export const TASK_VIEW = (res: Response, result: ITaskModel): Response => res.status(200).json({ ...success, result });
export const DELETED_VIEW = (res: Response): Response => res.status(204).send();
export const NOT_FOUND = (res: Response): Response => res.status(404).json({ ...error, result: "Not found" });
export const NOT_LOGGED_IN = (res: Response): Response =>
  res.status(401).json({ ...error, result: "User not logged in" });
export const PERMISSIONS_FAIL = (res: Response): Response =>
  res.status(401).json({ ...error, result: "Task doesn't exists or not enough permissions" });
