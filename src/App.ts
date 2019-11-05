import express from "express";
import session from "express-session";
import routes from "./routes";

const app = express();

app.use(express.json());
app.use(session({secret: "whatever!"}));
app.use(routes);

export default app;
