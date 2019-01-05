require('dotenv').load();
import * as Server from "./server";
import * as Database from "./database";
import * as Configs from "./configurations";
import * as Socket from "./socket";

require('dotenv').config();
console.log(`Running enviroment ${process.env.NODE_ENV || 'dev'}`);

// Catch unhandling unexpected exceptions
process.on('uncaughtException', (error: Error) => {
    console.error(`uncaughtException ${error.message}`);
});

// Catch unhandling rejected promises
process.on('unhandledRejection', (reason: any) => {
    console.error(`unhandledRejection ${reason}`);
});

// Define async start function
const start = async ({ config, db }) => {
    try {
        const server = await Server.init(config, db);
        await server.start();
        Socket.init(server.listener, function() {
            console.log('Server running at:', server.info.uri);
        });
    } catch (err) {
        console.error('Error starting server: ', err.message);
        throw err;
    }
};

// Init Database
 const dbConfigs = Configs.getDatabaseConfig();
 const database = (dbConfigs) ? Database.init(dbConfigs) : null;


// Starting Application Server
const serverConfigs = Configs.getServerConfigs();

// Start the server
start({
    config: serverConfigs,
    db: database
});