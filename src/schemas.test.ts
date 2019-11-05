import dbHandler from "./testDbHandler";

import TaskModel from "./models/TaskModel";

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe("Task Schema", () => {
  it("works", () => {
    const myTask = TaskModel.create({
      title: "Hello",
      description: "world",
      createdBy: 1,
      createdOn: new Date(),
      completed: false,
    });
  });
});
