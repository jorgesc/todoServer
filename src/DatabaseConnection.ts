import * as mongoose from "mongoose";

const connectionURI = "";

export default () => mongoose.connect(connectionURI, { useNewUrlParser: true });
