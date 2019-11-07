import TaskModel from "../models/TaskModel";

export const markAncestorsUncompleted = async (id: string): Promise<void> => {
  const next = await TaskModel.findOneAndUpdate({ _id: id }, { completed: false });
  if (next && next.parentTask) return markAncestorsUncompleted(next.parentTask);
};

export const checkAndCompleteAncestors = async (id: string): Promise<void> => {
  const children = await TaskModel.find({ parentTask: id });
  if (!children.every(c => c.completed)) return;
  const curr = await TaskModel.findOne({ _id: id });
  if (!curr) throw new Error(`Task with id: ${id} not found on database`);
  curr.completed = true;
  await curr.save();
  const { parentTask } = curr;
  if (parentTask) return await checkAndCompleteAncestors(parentTask);
};
