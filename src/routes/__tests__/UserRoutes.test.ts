import request, {Response} from "supertest";
import App from "../../App";
import dbHandler from "../../testDbHandler";
import UserModel from "../../models/UserModel";

import {IResponse} from "../../types/types";

interface IMyResponse extends Response {
  statusCode: number;
  body: IResponse;
}

beforeAll(async () => await dbHandler.connect());
afterEach(async () => await dbHandler.clearDatabase());
afterAll(async () => await dbHandler.closeDatabase());

describe("UserViews tests", () => {
  it("Can create a new user", async () => {
    const userData = {email: "asdf", password: "qwer"};
    expect(await UserModel.find({}).exec()).toHaveLength(0);

    const response = (await request(App)
      .post("/users/")
      .send(userData)) as IMyResponse;

    expect(response.statusCode).toEqual(201);
    expect(response.body.status).toEqual("ok");
    expect(response.body.result).toMatchObject(userData);
    const users = await UserModel.find({}).exec();
    expect(users).toHaveLength(1);

    expect(users[0].email).toEqual(userData.email);
    expect(users[0]).toEqual(expect.not.objectContaining({password: "qwer"}));
  });

  it("If user email already exists it will return an error", async () => {
    const userData = {email: "asdf", password: "qwer"};

    await request(App)
      .post("/users/")
      .send(userData);
    const response = (await request(App)
      .post("/users/")
      .send(userData)) as IMyResponse;
    expect(response.statusCode).toEqual(409);
    expect(response.body).toEqual({
      status: "error",
      result: "Document already exists",
    });
  });
});
