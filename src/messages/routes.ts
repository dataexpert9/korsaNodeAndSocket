import * as Hapi from "hapi";
import * as Joi from "joi";
import MessageController from "./message-controller";
import * as MessageValidator from "./message-validator";
import { jwtValidator } from "../users/user-validator";
import { IDatabase } from "../database";
import { IServerConfigurations } from "../configurations";
import * as UserValidator from "../users/user-validator";
import * as path from 'path';

export default function (server: Hapi.Server, configs: IServerConfigurations, database: IDatabase) {

    const messageController = new MessageController(configs, database);
    server.bind(messageController);

    server.route({
        method: 'POST',
        path: '/GetAllNearByDrivers',
        config: {
            handler: messageController.GetAllNearByDrivers,
            //auth: "jwt",
            auth: false,
            tags: ['api', 'GetAllNearByDrivers'],
            description: 'Send All Near By Drivers',
            validate: {
                payload: MessageValidator.LocationOjectModel,               
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Get all near by drivers.'
                        },
                        '404': {
                            'description': 'Get all near by drivers.'
                        }
                    }
                }
            }
        }
    });  
    
    server.route({
        method: 'GET',
        path: '/driver/updatedirection/{driverid}/{direction}',
        config: {
            handler: messageController.UpsertDriverDirection,
            auth: false,
            tags: ['api', 'drivers'],
            description: 'Upsert driver info.',
            validate: {
                params: {
                    driverid: Joi.string().required(),
                    direction: Joi.number().required()
                },
                //headers: UserValidator.jwtValidator,
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'User founded.'
                        },
                        '401': {
                            'description': 'Please login.'
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/LoadMessage/{channel}/{currentPageNo}/{totalrecords}',
        config: {
            handler: messageController.getAllMessagesWithPagging,
            //auth: "jwt",
            auth: false,
            tags: ['api', 'LoadMessageWithPageNo'],
            description: 'Get All Messages with PageNo',
            validate: {
                params: {
                    channel: Joi.string().required(),
                    currentPageNo: Joi.number().required(),
                    totalrecords: Joi.number().required()
                },
                //headers: jwtValidator
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Messages founded.'
                        },
                        '404': {
                            'description': 'Messages does not exists.'
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/LoadMessageMobile',
        config: {
            handler: messageController.getAllMessagesWithPaggingMobile,
            //auth: "jwt",
            auth: false,
            tags: ['api', 'LoadMessageMobile'],
            description: 'Get All Messages with PageNo',
            validate: {
                payload: {
                    channel: Joi.string().required(),
                    currentPageNo: Joi.number().required(),
                    totalrecords: Joi.number().required()
                },
                //headers: jwtValidator
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Messages founded.'
                        },
                        '404': {
                            'description': 'Messages does not exists.'
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/UploadMedia',
        config: {
            handler: messageController.UploadMedia,
            //auth: "jwt",
            auth: false,
            tags: ['api', 'UploadMedia'],
            description: 'Upload Media',
            payload: {
                output: "stream",
                parse: true,
                allow: "multipart/form-data",
                maxBytes: 1000000000
            },
            //headers: jwtValidator
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Upload Media.'
                        },
                        '404': {
                            'description': 'Upload Media.'
                        }
                    }
                }
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/uploads/attachments/{file*}',
        handler: {
          directory: {
            path: './uploads/attachments/',
            listing: true
          }
        },
        config: {
            auth: false,
            tags: ['api', 'GetMedia'],
            description: 'Get Media',
        }
      });

    server.route({
        method: 'GET',
        path: '/LoadChannel/{channel}',
        config: {
            handler: messageController.getAllRequestByChannel,
            //auth: "jwt",
            auth: false,
            tags: ['api', 'LoadMessage'],
            description: 'Get All Requests',
            validate: {
                params: {
                    channel: Joi.string().required(),
                },
                //headers: jwtValidator
            },
            plugins: {
                'hapi-swagger': {
                    responses: {
                        '200': {
                            'description': 'Requests founded.'
                        },
                        '404': {
                            'description': 'Requests does not exists.'
                        }
                    }
                }
            }
        }
    });
}