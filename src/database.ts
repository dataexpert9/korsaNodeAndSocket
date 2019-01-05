import * as Mongoose from "mongoose";
import { IDataConfiguration } from "./configurations";
import { ITask, TaskModel } from "./tasks/task";
import { UserInterface, UserModel, UserPushInterface } from "./users/user";
import { DriverModel } from "./messages/messages";

export interface IDatabase {
    taskModel: Mongoose.Model<ITask>;
    userModel:Mongoose.Model<UserPushInterface>;
    driverModel:Mongoose.Model<DriverModel>;
}

export function init(config: IDataConfiguration): IDatabase {

    (<any>Mongoose).Promise = Promise;
    Mongoose.connect(process.env.MONGO_URL || config.connectionString);

    let mongoDb = Mongoose.connection;

    mongoDb.on('error', () => {
        console.log(`Unable to connect to database: ${config.connectionString}`);
    });

    mongoDb.once('open', () => {
        console.log(`Connected to database: ${config.connectionString}`);
    });

    return {
        taskModel: TaskModel,
        userModel:UserModel,
        driverModel:DriverModel
    };
}