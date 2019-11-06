import {Request, Response} from "express";
import UserModel from "../models/UserModel";

const DOCUMENT_EXISTS_ERROR = {
  status: "error",
  result: "Document already exists",
};

const INVALID_LOGIN_ERROR = {
  status: "error",
  result: "Invalid login",
};

const SUCCESS = {
  status: "ok",
  result: "",
};

export default {
  createNewUser: async (req: Request, res: Response): Promise<Response> => {
    const userData = req.body;

    const {email} = userData;
    const existing = await UserModel.findOne({email}).exec();
    if (existing) return res.status(409).json(DOCUMENT_EXISTS_ERROR);

    const newUser = new UserModel(userData);
    const output = await newUser.save();
    return res.status(201).json({...SUCCESS, result: output});
  },

  amILoggedIn: (req: Request, res: Response): Response => {
    const loggedIn = !!(req.session && req.session.userId);
    return res.status(200).json({...SUCCESS, result: loggedIn});
  },

  logIn: async (req: Request, res: Response): Promise<Response> => {
    const {email, password} = req.body;
    const user = await UserModel.findOne({email}).exec();
    if (!(req.session && user && (await user.checkPassword(password)))) {
      return res.status(403).json(INVALID_LOGIN_ERROR);
    }

    req.session.userId = user._id;
    return res.status(200).json(SUCCESS);
  },

  logOut: (req: Request, res: Response): Response => {
    if (req.session) delete req.session.userId;
    return res.status(200).json(SUCCESS);
  },
};
