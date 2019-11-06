import mongoose from "mongoose";
import request from "supertest-session";
import App from "../../App";
import {ITask} from "../../types/types";
import {Response} from "express";
import dbHandler from "../../testSetup/testDbHandler";
import TaskModel, {ITaskModel} from "../../models/TaskModel";

import {advanceTo, advanceBy} from "jest-date-mock";

import {IResponse} from "../../types/types";

interface IMyResponse extends Response {
  statusCode: number;
  body: IResponse;
}

interface IMyTaskModel extends ITaskModel {
  _doc?: ITask;
}

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

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
    await testSession.post("/users/login").send(userData);

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
});
