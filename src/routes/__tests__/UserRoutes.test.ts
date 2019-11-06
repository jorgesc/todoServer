import request from "supertest-session";
import {Response} from "express";
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

  it("Can log in", async () => {
    // Create the user
    const userData = {email: "asdf", password: "qwer"};

    await request(App)
      .post("/users/")
      .send(userData);

    // Test it

    const testSession = request(App);

    const response = (await testSession.get(
      "/users/amILoggedIn",
    )) as IMyResponse;

    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({status: "ok", result: false});

    const response2 = (await testSession
      .post("/users/login")
      .send({email: "asdf", password: "asdf"})) as IMyResponse;

    expect(response2.statusCode).toEqual(403);
    expect(response2.body).toEqual({status: "error", result: "Invalid login"});

    const response3 = (await testSession
      .post("/users/login")
      .send({email: "asdf", password: "qwer"})) as IMyResponse;

    expect(response3.statusCode).toEqual(200);
    expect(response3.body).toEqual({status: "ok", result: ""});

    const response4 = (await testSession.get(
      "/users/amILoggedIn",
    )) as IMyResponse;

    expect(response4.statusCode).toEqual(200);
    expect(response4.body).toEqual({status: "ok", result: true});
  });

  it("Can log out", async () => {
    // Create the user
    const userData = {email: "asdf", password: "qwer"};
    // prettier-ignore
    await request(App).post("/users/").send(userData);

    // Test it
    const testSession = request(App);
    await testSession.post("/users/login").send(userData);
    const response = (await testSession.get(
      "/users/amILoggedIn",
    )) as IMyResponse;

    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({status: "ok", result: true});

    const response2 = (await testSession.get("/users/logout")) as IMyResponse;
    expect(response2.statusCode).toEqual(200);
    expect(response2.body).toEqual({status: "ok", result: ""});

    const response3 = (await testSession.get(
      "/users/amILoggedIn",
    )) as IMyResponse;

    expect(response3.statusCode).toEqual(200);
    expect(response3.body).toEqual({status: "ok", result: false});
  });
});
