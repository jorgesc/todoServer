import mongoose from "mongoose";
import request from "supertest-session";
import App from "../../App";
import { ITask } from "../../models/TaskModel";
import { Response } from "express";
import dbHandler from "../../testSetup/testDbHandler";
import TaskModel, { ITaskModel } from "../../models/TaskModel";
import UserModel, { IUserModel } from "../../models/UserModel";

interface IMyResponse extends Response {
  statusCode: number;
  body: {
    status: "ok" | "error";
    result: null | string | IUserModel | boolean;
  };
}

interface IMyTaskModel extends ITaskModel {
  _doc?: ITask;
}

beforeEach(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.closeDatabase());

describe("Task Routes: Create task", () => {
  let testSession: any;
  let userId: string;

  beforeEach(async () => {
    testSession = request(App);
    const userData = { email: "asdf", password: "qwer" };
    const user = await request(App)
      .post("/users/")
      .send(userData);
    const loginResponse = await testSession.post("/users/login").send(userData);

    userId = user.body.result._id;
  });

  it("Can't create anything when user is not logged in", async () => {
    const taskData = {
      title: "Test task",
      description: "Whatever"
    };

    const taskResponse = await request(App)
      .post("/tasks")
      .send(taskData);
    expect(taskResponse.statusCode).toEqual(401);
    expect(taskResponse.body.status).toEqual("error");
    expect(taskResponse.body.result).toEqual("User not logged in");
  });

  it("Create a simple task with no parent", async () => {
    const taskData = {
      title: "Test task",
      description: "Whatever"
    };

    const taskResponse = await testSession.post("/tasks").send(taskData);
    expect(taskResponse.statusCode).toEqual(200);
    expect(taskResponse.body.status).toEqual("ok");
    expect(taskResponse.body.result).toMatchObject(taskData);
    expect(taskResponse.body.result.createdBy).toEqual(userId);

    const returnedDate = new Date(taskResponse.body.result.createdOn).getTime();
    const now = new Date().getTime();

    expect(now - returnedDate).toBeLessThan(100);
    expect(taskResponse.body.result.completed).toEqual(false);
    expect(taskResponse.body.result.children).toEqual([]);

    const tasksOnDb = await TaskModel.find({}).exec();
    expect(tasksOnDb).toHaveLength(1);

    const dbTask = tasksOnDb[0];
    const returnedTask = taskResponse.body.result;

    expect(dbTask.title).toEqual(returnedTask.title);
    expect(dbTask.description).toEqual(returnedTask.description);
    expect(dbTask.completed).toEqual(returnedTask.completed);

    expect(dbTask.createdBy.toString()).toEqual(returnedTask.createdBy);
    expect(dbTask.createdOn.toISOString()).toEqual(returnedTask.createdOn);

    expect(dbTask._id.toString()).toBe(returnedTask._id);
    expect(Array.from(dbTask.children)).toEqual(returnedTask.children);
  });

  it("Overrides _id, createdBy, etc post fields if the request includes it", async () => {
    const taskData = {
      title: "Test task",
      description: "Whatever",
      createdBy: mongoose.Types.ObjectId(),
      _id: mongoose.Types.ObjectId(),
      createdOn: new Date(2011, 4, 6, 0, 0, 0),
      completed: true
    };

    const taskResponse = await testSession.post("/tasks").send(taskData);
    expect(taskResponse.statusCode).toEqual(200);
    expect(taskResponse.body.status).toEqual("ok");

    const tasksOnDb = await TaskModel.find({}).exec();
    expect(tasksOnDb).toHaveLength(1);

    const dbTask = tasksOnDb[0];
    expect(dbTask.title).toEqual(taskData.title);
    expect(dbTask.description).toEqual(taskData.description);
    expect(dbTask.createdBy).not.toEqual(taskData.createdBy);
    expect(dbTask.createdOn).not.toEqual(taskData.createdOn);
    expect(dbTask._id).not.toEqual(taskData._id);
    expect(dbTask.completed).not.toEqual(taskData.completed);
  });

  it("Creates a task with a parent", async () => {
    const parentTaskData = {
      title: "Test task",
      description: "Whatever"
    };

    const parentTaskResponse = await testSession.post("/tasks").send(parentTaskData);
    const parentTaskId = parentTaskResponse.body.result._id;

    const childTaskData = {
      title: "Child task",
      description: "hehehehe",
      parentTask: parentTaskId
    };

    const childTaskResponse = await testSession.post("/tasks").send(childTaskData);
    const tasksOnDb = await TaskModel.find({}).exec();
    expect(tasksOnDb).toHaveLength(2);

    const childTaskDb = (await TaskModel.findOne({
      title: "Child task"
    }).exec()) as ITaskModel;
    expect(childTaskDb.parentTask).toEqual(mongoose.Types.ObjectId(parentTaskId));
  });

  it("Adding a new child marks all its ancestors as uncompleted", async () => {
    const grandParentTask = new TaskModel({
      title: "Grand Parent task",
      description: "Description",
      completed: true,
      createdBy: userId,
      createdOn: new Date()
    });
    await grandParentTask.save();

    const parentTask = new TaskModel({
      title: "Parent task",
      description: "Description",
      completed: true,
      createdBy: userId,
      createdOn: new Date(),
      parentTask: grandParentTask._id
    });

    await parentTask.save();

    const childTaskData = {
      title: "Child task",
      description: "child task desfc",
      parentTask: parentTask._id
    };

    await testSession.post("/tasks").send(childTaskData);

    const dbTasks = await TaskModel.find({});
    expect(dbTasks).toHaveLength(3);

    const grandParentTaskDb = (await TaskModel.findOne({
      _id: grandParentTask._id
    })) as ITaskModel;
    expect(grandParentTaskDb.completed).toBe(false);

    const parentTaskDb = (await TaskModel.findOne({
      _id: parentTask._id
    })) as ITaskModel;
    expect(parentTaskDb.completed).toBe(false);
  });
});

describe("Task Routes: Read task", () => {
  const userData = { email: "asdf", password: "qwer" };
  let loggedSession: any;
  let session: any;
  let user: IUserModel;

  let parentTaskId: mongoose.Types.ObjectId;
  let childTask1Id: mongoose.Types.ObjectId;
  let childTask2Id: mongoose.Types.ObjectId;

  let parentTask: any;
  let childTask1: any;
  let childTask2: any;

  beforeEach(async () => {
    user = new UserModel(userData);
    await user.save();

    session = request(App);
    loggedSession = request(App);
    await loggedSession.post("/users/login").send(userData);

    parentTask = new TaskModel({
      title: "Grand Parent task",
      description: "bla bla bla",
      createdBy: user._id,
      createdOn: new Date(),
      completed: false
    });
    await parentTask.save();
    parentTaskId = parentTask._id;

    childTask1 = new TaskModel({
      parentTask: parentTask._id,
      title: "Child 1",
      description: "Description 2343",
      createdBy: user._id,
      createdOn: new Date(),
      completed: false
    });
    await childTask1.save();
    childTask1Id = childTask1._id;

    childTask2 = new TaskModel({
      parentTask: parentTask._id,
      title: "Child 2",
      description: "Description adsnfkenafe",
      createdBy: user._id,
      createdOn: new Date(),
      completed: false
    });
    await childTask2.save();
    childTask2Id = childTask2._id;
  });

  it("Returns error when user is not logged in", async () => {
    const response = await session.get(`/tasks/${parentTaskId.toString()}`);
    expect(response.statusCode).toEqual(401);
    expect(response.body.status).toEqual("error");
    expect(response.body.result).toEqual("User not logged in");
  });

  it("Returns permission error when the taskId doesnt exists", async () => {
    const response = await loggedSession.get(`/tasks/${mongoose.Types.ObjectId()}`);
    expect(response.statusCode).toEqual(401);
    expect(response.body.status).toEqual("error");
    expect(response.body.result).toEqual("Task doesn't exists or not enough permissions");
  });

  it("Returns the task and its children", async () => {
    const response = await loggedSession.get(`/tasks/${parentTaskId}`);

    expect(response.statusCode).toEqual(200);
    expect(response.body.status).toEqual("ok");
    expect(response.body.result.title).toEqual(parentTask.title);
    expect(response.body.result.description).toEqual(parentTask.description);
    expect(response.body.result._id).toEqual(parentTask._id.toString());

    expect(response.body.result.children).toHaveLength(2);
    expect(response.body.result.children[0].title).toEqual(childTask1.title);
    expect(response.body.result.children[0].description).toEqual(childTask1.description);
    expect(response.body.result.children[0]._id).toEqual(childTask1._id.toString());

    expect(response.body.result.children[1].title).toEqual(childTask2.title);
    expect(response.body.result.children[1].description).toEqual(childTask2.description);
    expect(response.body.result.children[1]._id).toEqual(childTask2._id.toString());
  });
});

describe("Task Routes: Delete task", () => {
  const userData = { email: "asdf", password: "qwer" };
  let user: IUserModel;
  let loggedSession: any;
  let session: any;

  beforeEach(async () => {
    user = new UserModel(userData);
    await user.save();
    session = request(App);
    loggedSession = request(App);
    await loggedSession.post("/users/login").send(userData);
  });

  it("Delete a task with no parent", async () => {
    const amILoggedIn = await loggedSession.get("/users/amILoggedIn");
    expect(amILoggedIn.body.result).toBe(true);

    const parentTask = new TaskModel({
      title: "Grand Parent task",
      description: "bla bla bla",
      createdBy: user._id,
      createdOn: new Date(),
      completed: false
    });
    await parentTask.save();

    const response = await loggedSession.delete(`/tasks/${parentTask._id}`);
    expect(response.statusCode).toEqual(204);

    const dbItems = await TaskModel.find({}).exec();
    expect(dbItems).toHaveLength(0);
  });

  it("Only creator can delete task", async () => {
    const userData2 = { email: "asdfqwer", password: "qwerasdf" };
    const user2 = new UserModel(userData2);
    await user2.save();

    const amILoggedIn = await loggedSession.get("/users/amILoggedIn");
    expect(amILoggedIn.body.result).toBe(true);

    const parentTask = new TaskModel({
      title: "Grand Parent task",
      description: "bla bla bla",
      createdBy: user2._id,
      createdOn: new Date(),
      completed: false
    });
    await parentTask.save();

    const response = await loggedSession.delete(`/tasks/${parentTask._id}`);
    expect(response.statusCode).toEqual(401);

    const dbItems = await TaskModel.find({}).exec();
    expect(dbItems).toHaveLength(1);
  });

  it("If task doesnt exists return 401", async () => {
    const id = mongoose.Types.ObjectId();
    const response = await request(App).delete(`/tasks/${id}`);
    expect(response.statusCode).toEqual(401);
  });

  it("Deleting task trigger ancestor check for completion", async () => {
    const grandParent = new TaskModel({
      title: "grand",
      description: "grand desct",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    grandParent.save();

    const parent1 = new TaskModel({
      parentTask: grandParent._id,
      title: "par1",
      description: "par",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    parent1.save();

    const parent2 = new TaskModel({
      parentTask: grandParent._id,
      title: "par2",
      description: "par",
      completed: true,
      createdBy: user._id,
      createdOn: new Date()
    });
    parent2.save();

    const child1 = new TaskModel({
      parentTask: parent1._id,
      title: "child1",
      description: "par",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    child1.save();

    const child2 = new TaskModel({
      parentTask: parent1._id,
      title: "child2",
      description: "par",
      completed: true,
      createdBy: user._id,
      createdOn: new Date()
    });
    child2.save();

    const response = await loggedSession.delete(`/tasks/${child1._id}`);

    const items = await TaskModel.find({}).exec();
    items.forEach(item => {
      expect(item.completed).toBe(true);
    });

    expect(await TaskModel.find({ _id: child1._id }).exec()).toHaveLength(0);
    const updatedParent1 = await TaskModel.findOne({ _id: parent1._id });
    if (!updatedParent1) throw new Error("This is not going to happen");
    expect(updatedParent1.completed).toBe(true);

    const updatedGrand = await TaskModel.findOne({ _id: grandParent._id });
    if (!updatedGrand) throw new Error("This is not going to happen");
    expect(updatedGrand.completed).toBe(true);
  });
});

describe("Task Routes: Edit task", () => {
  const userData = { email: "asdf", password: "qwer" };
  let user: IUserModel;
  let loggedSession: any;
  let session: any;

  beforeEach(async () => {
    user = new UserModel(userData);
    await user.save();
    session = request(App);
    loggedSession = request(App);
    await loggedSession.post("/users/login").send(userData);
  });

  it("Response is 401 when taskId doesn't exists", async () => {
    const response = await loggedSession.put(`/tasks/${mongoose.Types.ObjectId()}`).send({ completed: true });
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      status: "error",
      result: "Task doesn't exists or not enough permissions"
    });
  });

  it("Response is 401 when user is not logged in", async () => {
    const task = new TaskModel({
      title: "hello",
      description: "asdf",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    await task.save();

    const response = await session.put(`/tasks/${task._id}`).send({ completed: true });
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      status: "error",
      result: "User not logged in"
    });
  });

  it("Response is 401 when user is not task creator", async () => {
    const user2 = new UserModel({ email: "wwwww", password: "qqqqqq" });
    await user2.save();
    const task = new TaskModel({
      title: "hello",
      description: "asdf",
      completed: false,
      createdBy: user2._id,
      createdOn: new Date()
    });
    await task.save();

    const response = await loggedSession.put(`/tasks/${task._id}`).send({ completed: true });
    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      status: "error",
      result: "Task doesn't exists or not enough permissions"
    });
  });

  it("Updates one field of the task", async () => {
    const task = new TaskModel({
      title: "hello",
      description: "asdf",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    await task.save();
    const response = await loggedSession.put(`/tasks/${task._id}`).send({ completed: true });
    expect(response.statusCode).toEqual(200);
    expect(response.body.status).toEqual("ok");
    expect(response.body.result.title).toEqual(task.title);
    expect(response.body.result.description).toEqual(task.description);
    expect(response.body.result.createdBy).toEqual(task.createdBy.toString());
    expect(response.body.result.completed).toEqual(true);
  });

  it("Updates multiple fields on a task", async () => {
    const task = new TaskModel({
      title: "hello",
      description: "asdf",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    await task.save();
    const response = await loggedSession
      .put(`/tasks/${task._id}`)
      .send({ completed: true, title: "World", description: "jejejeje" });
    expect(response.statusCode).toEqual(200);
    expect(response.body.status).toEqual("ok");
    expect(response.body.result.title).toEqual("World");
    expect(response.body.result.description).toEqual("jejejeje");
    expect(response.body.result.createdBy).toEqual(task.createdBy.toString());
    expect(response.body.result.completed).toEqual(true);
  });

  it("Marking task as uncompleted, uncomplete all the ancestors", async () => {
    const grandParentTask = new TaskModel({
      title: "hello",
      description: "asdf",
      completed: true,
      createdBy: user._id,
      createdOn: new Date()
    });
    await grandParentTask.save();

    const parentTask = new TaskModel({
      parentTask: grandParentTask._id,
      title: "hello",
      description: "asdf",
      completed: true,
      createdBy: user._id,
      createdOn: new Date()
    });
    await parentTask.save();

    const childTask = new TaskModel({
      parentTask: parentTask._id,
      title: "hello",
      description: "asdf",
      completed: true,
      createdBy: user._id,
      createdOn: new Date()
    });
    await childTask.save();

    await loggedSession.put(`/tasks/${childTask._id}`).send({ completed: false });
    const dbTasks = await TaskModel.find({}).exec();
    dbTasks.forEach(t => expect(t.completed).toEqual(false));
  });

  it("If completed field is not touched, it doesnt touch ancestors", async () => {
    const grandParentTask = new TaskModel({
      title: "hello",
      description: "asdf",
      completed: true,
      createdBy: user._id,
      createdOn: new Date()
    });
    await grandParentTask.save();

    const parentTask = new TaskModel({
      parentTask: grandParentTask._id,
      title: "hello",
      description: "asdf",
      completed: true,
      createdBy: user._id,
      createdOn: new Date()
    });
    await parentTask.save();

    const childTask = new TaskModel({
      parentTask: parentTask._id,
      title: "hello",
      description: "asdf",
      completed: true,
      createdBy: user._id,
      createdOn: new Date()
    });
    await childTask.save();

    await loggedSession.put(`/tasks/${childTask._id}`).send({ title: "AAAA" });
    const dbTasks = await TaskModel.find({}).exec();
    dbTasks.forEach(t => expect(t.completed).toEqual(true));
  });

  it("Marking task as completed will update the neccessary ancestors", async () => {
    const grandGrandParentTask = new TaskModel({
      title: "ggpt",
      description: "asdf",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    await grandGrandParentTask.save();

    const grandParentTask = new TaskModel({
      parentTask: grandGrandParentTask._id,
      title: "gpt",
      description: "asdf",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    await grandParentTask.save();

    const grandParentTask2 = new TaskModel({
      parentTask: grandGrandParentTask._id,
      title: "gpt2",
      description: "asdf",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    await grandParentTask2.save();

    const parentTask = new TaskModel({
      parentTask: grandParentTask._id,
      title: "pt",
      description: "asdf",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    await parentTask.save();

    const parentTask2 = new TaskModel({
      parentTask: grandParentTask._id,
      title: "pt2",
      description: "asdf",
      completed: true,
      createdBy: user._id,
      createdOn: new Date()
    });
    await parentTask2.save();

    const childTask = new TaskModel({
      parentTask: parentTask._id,
      title: "hello",
      description: "asdf",
      completed: false,
      createdBy: user._id,
      createdOn: new Date()
    });
    await childTask.save();

    const childTask2 = new TaskModel({
      parentTask: parentTask._id,
      title: "hello",
      description: "asdf",
      completed: true,
      createdBy: user._id,
      createdOn: new Date()
    });
    await childTask2.save();

    const ct1b = (await TaskModel.findOne({ _id: childTask._id }).exec()) as ITaskModel;
    const pt1b = (await TaskModel.findOne({ _id: parentTask._id }).exec()) as ITaskModel;
    const gt1b = (await TaskModel.findOne({ _id: grandParentTask._id }).exec()) as ITaskModel;

    expect(ct1b.completed).toBe(false);
    expect(pt1b.completed).toBe(false);
    expect(gt1b.completed).toBe(false);

    expect(((await TaskModel.findOne({ _id: childTask._id }).exec()) as ITaskModel).completed).toBe(false);
    expect(((await TaskModel.findOne({ _id: parentTask._id }).exec()) as ITaskModel).completed).toBe(false);
    expect(((await TaskModel.findOne({ _id: grandParentTask._id }).exec()) as ITaskModel).completed).toBe(false);
    await loggedSession.put(`/tasks/${childTask._id}`).send({ completed: true });
    expect(((await TaskModel.findOne({ _id: childTask._id }).exec()) as ITaskModel).completed).toBe(true);
    expect(((await TaskModel.findOne({ _id: parentTask._id }).exec()) as ITaskModel).completed).toBe(true);
    expect(((await TaskModel.findOne({ _id: grandParentTask._id }).exec()) as ITaskModel).completed).toBe(true);
  });
});
