import express, {Request, Response} from "express";

const app = express();

app.use(express.json());
app.get(
  "/",
  (req: Request, res: Response): Response => {
    return res.json({status: "success", message: "Hello world"});
  },
);

const PORT = 3030;
app.listen(PORT, () => console.log("listening on port 3030"));
