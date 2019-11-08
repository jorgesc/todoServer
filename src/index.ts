import App from "./App";
import DatabaseConnection from "./DatabaseConnection";

const env = process.env.NODE_ENV || "development";
const PORT = env === "production" ? 80 : 3030;
if (env === "production") {
  DatabaseConnection().then(() => {
    App.listen(PORT, () => console.log("listening on port 80"));
  });
} else {
  App.listen(PORT, () => console.log("listening on port 3030"));
}
