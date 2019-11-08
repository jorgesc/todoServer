import mongoose, { Schema, model, Document } from "mongoose";

export interface ITask {
  parentTask?: string | null;
  title: string;
  description: string;
  createdBy: mongoose.Types.ObjectId;
  createdOn: Date;
  completed: boolean;
  completedOn?: Date;
  dueDate?: Date;
  estimatedCompletionTime?: number;
  children: string[];
}

export interface ITaskModel extends ITask, Document {}

const TaskSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, required: true },
  createdOn: { type: Date, required: true },
  completed: { type: Boolean, required: true, default: false },
  completedOn: { type: Date, required: false },
  dueDate: { type: Date, required: false },
  estimatedCompletionTime: { type: Number, required: false },
  children: [{ type: String, required: false }],
  parentTask: { type: Schema.Types.ObjectId, required: false }
});

export default model<ITaskModel>("task", TaskSchema);
