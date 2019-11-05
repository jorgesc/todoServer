import {Schema, model, Document} from "mongoose";
import {IUser} from "../types/types";

export interface IUserModel extends IUser, Document {}

const UserSchema = new Schema({
  email: {type: String, required: true},
  password: {type: String, required: true, select: false},
});

export default model<IUserModel>("user", UserSchema);
