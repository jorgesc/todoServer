import {Request, Response} from "express";
import UserModel from "../models/UserModel";

export default {
  createNewUser: async (req: Request, res: Response): Promise<void> => {
    const userData = req.body;
    const newUser = new UserModel(userData);
    const output = await newUser.save();
    res.status(201).json(output);
  },
};
