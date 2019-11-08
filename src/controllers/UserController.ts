import { Request, Response } from "express";
import UserModel from "../models/UserModel";

import { DOCUMENT_EXISTS_ERROR, SUCCESS, CREATED, LOGGED_IN, NOT_LOGGED_IN, LOGIN_FAILED } from "../views/UserViews";

export default {
  createNewUser: async (req: Request, res: Response): Promise<Response> => {
    const userData = req.body;

    const { email } = userData;
    const existing = await UserModel.findOne({ email }).exec();
    if (existing) return DOCUMENT_EXISTS_ERROR(res);

    const newUser = new UserModel(userData);
    const output = await newUser.save();
    return CREATED(res, output);
  },

  amILoggedIn: (req: Request, res: Response): Response => {
    const loggedIn = !!(req.session && req.session.userId);
    return loggedIn ? LOGGED_IN(res) : NOT_LOGGED_IN(res);
  },

  logIn: async (req: Request, res: Response): Promise<Response> => {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email }).exec();
    if (!(req.session && user && (await user.checkPassword(password)))) {
      return LOGIN_FAILED(res);
    }

    req.session.userId = user._id;
    return SUCCESS(res);
  },

  logOut: (req: Request, res: Response): Response => {
    if (req.session) delete req.session.userId;
    return SUCCESS(res);
  }
};
