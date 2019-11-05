import {Request, Response} from "express";
import UserModel from "../models/UserModel";

const DOCUMENT_EXISTS_ERROR = {
  status: "error",
  result: "Document already exists",
};

export default {
  createNewUser: async (req: Request, res: Response): Promise<Response> => {
    const userData = req.body;

    const {email} = userData;
    const existing = await UserModel.find({email}).exec();
    if (existing.length > 0) return res.status(409).json(DOCUMENT_EXISTS_ERROR);

    const newUser = new UserModel(userData);
    const output = await newUser.save();
    return res.status(201).json({status: "ok", result: output});
  },
};
