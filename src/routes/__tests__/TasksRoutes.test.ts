import mongoose from "mongoose";
import request from "supertest-session";
import App from "../../App";
import {ITask} from "../../types/types";
import {Response} from "express";
import dbHandler from "../../testSetup/testDbHandler";
import TaskModel, {ITaskModel} from "../../models/TaskModel";
import UserModel, {IUserModel} from "../../models/UserModel";

import {advanceTo, advanceBy} from "jest-date-mock";

import {IResponse} from "../../types/types";

interface IMyResponse extends Response {
  statusCode: number;
  body: IResponse;
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
    advanceTo(new Date(2019, 10, 10, 0, 0, 0));

    testSession = request(App);
    const userData = {email: "asdf", password: "qwer"};
    const user = await request(App)
      .post("/users/")
      .send(userData);
    const loginResponse = await testSession.post("/users/login").send(userData);

    userId = user.body.result._id;
  });

  it("Can't create anything when user is not logged in", async () => {
    const taskData = {
      title: "Test task",
      description: "Whatever",
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
      description: "Whatever",
    };

    const taskResponse = await testSession.post("/tasks").send(taskData);
    expect(taskResponse.statusCode).toEqual(201);
    expect(taskResponse.body.status).toEqual("ok");
    expect(taskResponse.body.result).toMatchObject(taskData);
    expect(taskResponse.body.result.createdBy).toEqual(userId);
    expect(taskResponse.body.result.createdOn).toEqual(
      new Date().toISOString(),
    );
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
      completed: true,
    };

    const taskResponse = await testSession.post("/tasks").send(taskData);
    expect(taskResponse.statusCode).toEqual(201);
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
      description: "Whatever",
    };

    const parentTaskResponse = await testSession
      .post("/tasks")
      .send(parentTaskData);
    const parentTaskId = parentTaskResponse.body.result._id;

    const childTaskData = {
      title: "Child task",
      description: "hehehehe",
      parentTask: parentTaskId,
    };

    const childTaskResponse = await testSession
      .post("/tasks")
      .send(childTaskData);
    const tasksOnDb = await TaskModel.find({}).exec();
    expect(tasksOnDb).toHaveLength(2);

    const childTaskDb = (await TaskModel.findOne({
      title: "Child task",
    }).exec()) as ITaskModel;
    expect(childTaskDb.parentTask).toEqual(
      mongoose.Types.ObjectId(parentTaskId),
    );
  });

  it("Adding a new child marks all its ancestors as uncompleted", async () => {
    const grandParentTask = new TaskModel({
      title: "Grand Parent task",
      description: "Description",
      completed: true,
      createdBy: userId,
      createdOn: new Date(),
    });
    await grandParentTask.save();

    const parentTask = new TaskModel({
      title: "Parent task",
      description: "Description",
      completed: true,
      createdBy: userId,
      createdOn: new Date(),
      parentTask: grandParentTask._id,
    });

    await parentTask.save();

    const childTaskData = {
      title: "Child task",
      description: "child task desfc",
      parentTask: parentTask._id,
    };

    await testSession.post("/tasks").send(childTaskData);

    const dbTasks = await TaskModel.find({});
    expect(dbTasks).toHaveLength(3);

    const grandParentTaskDb = (await TaskModel.findOne({
      _id: grandParentTask._id,
    })) as ITaskModel;
    expect(grandParentTaskDb.completed).toBe(false);

    const parentTaskDb = (await TaskModel.findOne({
      _id: parentTask._id,
    })) as ITaskModel;
    expect(parentTaskDb.completed).toBe(false);
  });
});

describe("Task Routes: Read task", () => {
  const userData = {email: "asdf", password: "qwer"};
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
      completed: false,
    });
    await parentTask.save();
    parentTaskId = parentTask._id;

    childTask1 = new TaskModel({
      parentTask: parentTask._id,
      title: "Child 1",
      description: "Description 2343",
      createdBy: user._id,
      createdOn: new Date(),
      completed: false,
    });
    await childTask1.save();
    childTask1Id = childTask1._id;

    childTask2 = new TaskModel({
      parentTask: parentTask._id,
      title: "Child 2",
      description: "Description adsnfkenafe",
      createdBy: user._id,
      createdOn: new Date(),
      completed: false,
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

  it("Returns not found when the taskId doesnt exists", async () => {
    const response = await loggedSession.get(
      `/tasks/${mongoose.Types.ObjectId()}`,
    );
    expect(response.statusCode).toEqual(404);
    expect(response.body.status).toEqual("error");
    expect(response.body.result).toEqual("Not found");
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
    expect(response.body.result.children[0].description).toEqual(
      childTask1.description,
    );
    expect(response.body.result.children[0]._id).toEqual(
      childTask1._id.toString(),
    );

    expect(response.body.result.children[1].title).toEqual(childTask2.title);
    expect(response.body.result.children[1].description).toEqual(
      childTask2.description,
    );
    expect(response.body.result.children[1]._id).toEqual(
      childTask2._id.toString(),
    );
  });
});
