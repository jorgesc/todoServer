import {Schema, model, Document} from "mongoose";

interface ITaskModel extends Document {
  title: string;
  description: string;
  createdBy: number;
  createdOn: Date;
  completed: boolean;
  completedOn?: Date;
  dueDate?: Date;
  estimatedCompletionTime?: number;
  children: string[];
}

const TaskSchema = new Schema({
  title: {type: String, required: true},
  description: {type: String, required: true},
  createdBy: {type: Number, required: true},
  createdOn: {type: Date, required: true},
  completed: {type: Boolean, required: true, default: false},
  completedOn: {type: Date, required: false},
  dueDate: {type: Date, required: false},
  estimatedCompletionTime: {type: Number, required: false},
  children: [{type: String, required: false}],
});

export default model<ITaskModel>("task", TaskSchema);
