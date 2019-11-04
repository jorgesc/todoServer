import express from "express";
import routes from "./routes";

const app = express();

app.use(express.json());
app.use(routes);

const PORT = 3030;
app.listen(PORT, () => console.log("listening on port 3030"));
