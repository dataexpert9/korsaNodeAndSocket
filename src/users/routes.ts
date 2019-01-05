import * as Hapi from "hapi";
import * as Joi from "joi";
import UserController from "./user-controller";
//import { UserModel } from "./user";
import * as UserValidator from "./user-validator";
import { IDatabase } from "../database";
import { IServerConfigurations } from "../configurations";

export default function (server: Hapi.Server, serverConfigs: IServerConfigurations, database: IDatabase) {

    const userController = new UserController(serverConfigs, database);
    server.bind(userController);    

    server.route({
        method: 'POST',
        path: '/users/login',
        config: {
            handler: userController.loginUser,
            auth: false,
            tags: ['api', 'users'],
            description: 'Login a user.',
            validate: {
                payload: UserValidator.loginUserModel
            },
            cors: {
                origin: ["*:*"],
                headers: ["Accept", "Content-Type"],
                additionalHeaders: ['cache-control', 'x-requested-with']
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'User logged in.'
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/users/RegisterPushNotification',
        config: {
            handler: userController.RegisterPushNotification,
            auth: false,
            tags: ['api', 'users'],
            description: 'Register for Push Notificataion.',
            validate: {
                payload: UserValidator.PushModel
            },
            cors: {
                origin: ["*:*"],
                headers: ["Accept", "Content-Type"],
                additionalHeaders: ['cache-control', 'x-requested-with']
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Register for Push Notificataion.'
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/User/SendPushNotification',
        config: {
            handler: userController.PushNotification,
            //auth: "jwt",
            auth: false,
            tags: ['api', 'SendPushNotification'],
            description: 'Send Push Notification',
            validate: {
                payload: UserValidator.PushSendModel,
                //headers: jwtValidator
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Send Push Notification.'
                        },
                        '404': {
                            'description': 'Send Push Notification.'
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/User/PushNotificationV1',
        config: {
            handler: userController.PushNotificationV1,
            //auth: "jwt",
            auth: false,
            tags: ['api', 'PushNotificationV1'],
            description: 'Send Push Notification version',
            validate: {
                payload: UserValidator.PushSendModel,
                //headers: jwtValidator
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Send Push Notification v1.'
                        },
                        '404': {
                            'description': 'Send Push Notification v1.'
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/User/PushNotificationV2',
        config: {
            handler: userController.PushNotificationV2,
            //auth: "jwt",
            auth: false,
            tags: ['api', 'PushNotificationV2'],
            description: 'Send Push Notification version',
            validate: {
                payload: UserValidator.PushSendModelV2,
                //headers: jwtValidator
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Send Push Notification v1.'
                        },
                        '404': {
                            'description': 'Send Push Notification v1.'
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/User/SendPushNotificationLiveTracking',
        config: {
            handler: userController.PushNotificationComplex,
            //auth: "jwt",
            auth: false,
            tags: ['api', 'SendPushNotificationLiveTracking'],
            description: 'Send Push Notification for live tracking with information',
            validate: {
                payload: UserValidator.PushSendModelComplex,
                //headers: jwtValidator
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Send Push Notification for live tracking.'
                        },
                        '404': {
                            'description': 'Send Push Notification for live tracking.'
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/User/SendPushNotificationMessageReceived',
        config: {
            handler: userController.PushNotificationMessageRecieved,
            //auth: "jwt",
            auth: false,
            tags: ['api', 'SendPushNotification'],
            description: 'Send Push Notification',
            validate: {
                payload: UserValidator.PushSendModelMessageRecieved,
                //headers: jwtValidator
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Send Push Notification.'
                        },
                        '404': {
                            'description': 'Send Push Notification.'
                        }
                    }
                }
            }
        }
    });
}