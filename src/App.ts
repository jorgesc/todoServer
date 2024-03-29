import express from "express";
import session from "express-session";
import routes from "./routes";

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  if (!req.locals) req.locals = {};
  next();
});

app.use(
  session({
    secret: "whatever!",
    resave: false,
    saveUninitialized: false
  })
);
app.use(routes);

export default app;
