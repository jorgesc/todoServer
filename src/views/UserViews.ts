import { Response } from "express";
import { IUserModel } from "../models/UserModel";

export const SUCCESS = (res: Response): Response => res.status(200).json({ status: "ok", result: "" });
export const USER_VIEW = (res: Response, user: IUserModel): Response =>
  res.status(200).json({ status: "ok", result: user });

export const CREATED = (res: Response, user: IUserModel): Response =>
  res.status(201).json({ status: "ok", result: user });

export const DOCUMENT_EXISTS_ERROR = (res: Response): Response =>
  res.status(409).json({ status: "error", result: "Document already exists" });

export const LOGGED_IN = (res: Response): Response => res.status(200).json({ status: "ok", result: true });
export const NOT_LOGGED_IN = (res: Response): Response => res.status(200).json({ status: "ok", result: false });
export const LOGIN_FAILED = (res: Response): Response =>
  res.status(403).json({ status: "error", result: "Invalid login" });
