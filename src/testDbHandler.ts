import {connect, connection} from "mongoose";
import {MongoMemoryServer} from "mongodb-memory-server";

const mongod = new MongoMemoryServer();

const dbHandler: {[key: string]: () => void} = {};

/** *  * Connect to the in-memory database. *   */
dbHandler.connect = async () => {
  const uri = await mongod.getConnectionString();

  const mongooseOpts = {
    useNewUrlParser: true,
    autoReconnect: true,
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 1000,
  };

  await connect(
    uri,
    mongooseOpts,
  );
};

/** *  * Drop database, close the connection and stop mongod. *   */
dbHandler.closeDatabase = async () => {
  await connection.dropDatabase();
  await connection.close();
  await mongod.stop();
};

/** *  * Remove all the data for all db collections.*   */
dbHandler.clearDatabase = async () => {
  const collections = connection.collections;
  const keys = Object.keys(collections);
  keys.forEach(k => collections[k].deleteMany({}));
};

export default dbHandler;
