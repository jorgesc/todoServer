import { Schema, model, Document } from "mongoose";

interface IUser {
  email: string;
}

export interface IUserModel extends IUser, Document {
  checkPassword: (candidate: string) => boolean;
}

interface IWithPassword extends IUserModel {
  password: string;
}

const UserSchema = new Schema({
  email: { type: String, required: true },
  password: { type: String, required: true, select: false }
});

UserSchema.methods.checkPassword = async function(candidate: string): Promise<boolean> {
  const user = (await UserModel.findOne({ email: this.email })
    .select("+password")
    .exec()) as IWithPassword;
  return candidate === user.password;
};

const UserModel = model<IUserModel>("user", UserSchema);
export default UserModel;
