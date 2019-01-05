import * as Hapi from 'hapi';
import * as Boom from 'boom';
import * as Jwt from 'jsonwebtoken';
import { IUser } from './user';
import { IDatabase } from '../database';
import { IServerConfigurations } from '../configurations';
import { IRequest, ILoginRequest, IPushRequest, IPushSendRequest, IUserUpdateRequest,IPushSendRequestV2, IPushSendRequestComplex, IPushSendRequestV1, IPushSendRequestMessageRecieved } from '../interfaces/request';
import { HttpRequest } from '../helper/request';
import { ConstentsVariable } from '../helper/constents';
import { UserType } from '../helper/enumerations';
import { UserPushInterface } from "../users/user";

let FormData = require("form-data");
let redisClient = require('redis-connection')();

export default class UserController {
    private database: IDatabase;
    private configs: IServerConfigurations;

    constructor(configs: IServerConfigurations, database: IDatabase) {
        this.database = database;
        this.configs = configs;
    }

    private generateToken(user: IUser) {
        const jwtSecret = this.configs.jwtSecret;
        const jwtExpiration = this.configs.jwtExpiration;
        const payload = { id: user.id };

        return Jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiration });
    }

    public async loginUser(request: ILoginRequest, h: Hapi.ResponseToolkit) {
        const { email, password, userType } = request.payload;
        let formDate: FormData = new FormData();
        formDate.append("email", email);
        formDate.append("password", password);

        let userResponse: any = await HttpRequest.postFormData(userType === UserType.Agent.valueOf() ?
            ConstentsVariable.AgentLoginServiceCall : ConstentsVariable.UserLoginServiceCall, formDate);

        if (!userResponse) {
            return Boom.unauthorized(userResponse.Message);
        }

        if (userResponse.Response !== 200 && userResponse.Response !== 2000) {
            return { statusCode: 401, Message: userResponse.Message };
        }

        //let user: any = await this.database.userModel.create(request.payload);

        let user: IUser;
        if (userType === UserType.Agent.valueOf()) {
            user = {
                //id: parseInt(userResponse.Result.id, 2),
                id: userResponse.Result.id,
                email: userResponse.Result.email.toString(),
                updateAt: userResponse.Result.updated_at,
                createdAt: userResponse.Result.created_at,
                name: userResponse.Result.username.toString(),
                image: userResponse.Result.image.toString(),
                password: "default",
                token: ""
            };
        } else {
            user = {
                id: userResponse.Result.id,
                email: userResponse.Result.email.toString(),
                updateAt: userResponse.Result.updated_at,
                createdAt: userResponse.Result.created_at,
                name: userResponse.Result.user_name.toString(),
                image: userResponse.Result.image.toString(),
                password: "default",
                token: ""
            };
        }

        user.token = this.generateToken(user);
        return { statusCode: 200, user: user };
    }

    public async RegisterPushNotification(request: IPushRequest, h: Hapi.ResponseToolkit) {
        try {
            //let query = {UserId : request.payload.UserId, UDID : request.payload.UDID, UserType: request.payload.UserType},
            let query = {UserId : request.payload.UserId, UserType: request.payload.UserType},
            update =  { $set: request.payload },
            options = { upsert: true, setDefaultsOnInsert: true };
            let UserPushInterface: UserPushInterface = await this.database.userModel.findOneAndUpdate(query, update, options);
            return h.response({ statusCode:200, Result: true }).code(200);
        } catch (error) {
            return Boom.badImplementation(error);
        }
    }

    public async PushNotification(request: IPushSendRequest, h: Hapi.ResponseToolkit) {
        try {
            let {UserId, Message, Channel} = request.payload;
            let UserPushInterface: UserPushInterface[] = await this.database.userModel.find({UserId : UserId});
            UserPushInterface.forEach((element) => {
                if (element) {
                    let notificationTitle:string = "";
                    if (Channel.indexOf("121") > -1) {
                        let MessageObj = JSON.parse(Message);
                        notificationTitle = MessageObj.senderUserName;
                    } else {
                        notificationTitle = "Mr." + process.env.AppName;
                    }
                    HttpRequest.SendFCMMessage(process.env.SERVERKEY,
                        element.Token, notificationTitle, Message, Channel);
                    HttpRequest.SendFCMMessage(process.env.DRIVERSERVERKEY,
                        element.Token, notificationTitle, Message, Channel);
                        
                }
            });
            return h.response({ statusCode:200, Result: true }).code(200);
        } catch (error) {
            return Boom.badImplementation(error);
        }
    }

    public async PushNotificationV2(request: IPushSendRequestV2, h: Hapi.ResponseToolkit) {
        try {
            let {Message, Channel, UserType,PushType, userid, driverid, orderid} = request.payload;
            let UserPushInterface: UserPushInterface[] = await this.database.userModel.find({UserId : userid,UserType : UserType});
            UserPushInterface.forEach((element) => {
                if (element) {
                    let notificationTitle:string = "";
                    notificationTitle = "Dear user";
                    if(element.UserType == 0){
                        HttpRequest.SendFCMMessageV2(process.env.SERVERKEY,
                            element.Token, notificationTitle, Message, Channel,PushType,driverid, orderid);
                    } else {
                        HttpRequest.SendFCMMessageV2(process.env.DRIVERSERVERKEY,
                            element.Token, notificationTitle, Message, Channel,PushType,driverid, orderid);
                    }   
                }
            });
            return h.response({ statusCode:200, Result: true }).code(200);
        } catch (error) {
            return Boom.badImplementation(error);
        }
    }

    public async PushNotificationMessageRecieved(request: IPushSendRequestMessageRecieved, h: Hapi.ResponseToolkit) {
        try {
            let {UserId, Message, Channel, userType, PushType, senderId, senderName} = request.payload;
            if(userType == 0) { userType = 1 } else {userType = 0}
            let UserPushInterface: UserPushInterface[] = await this.database.userModel.find({UserId : UserId, UserType: userType});
            UserPushInterface.forEach((element) => {
                if (element) {
                    let notificationTitle:string = senderName;
                    
                    if(userType == 0){
                        HttpRequest.SendFCMMessageRecieved(process.env.SERVERKEY,element.Token, notificationTitle, Message, Channel,PushType, senderId);
                    } else {
                        HttpRequest.SendFCMMessageRecieved(process.env.DRIVERSERVERKEY,element.Token, notificationTitle, Message, Channel,PushType, senderId);
                    }                        
                }
            });
            return h.response({ statusCode:200, Result: true }).code(200);
        } catch (error) {
            return Boom.badImplementation(error);
        }
    }

    public async PushNotificationV1(request: IPushSendRequestV1, h: Hapi.ResponseToolkit) {
        try {
            let {UserId, Message, Channel, UserType,PushType} = request.payload;
            let UserPushInterface: UserPushInterface[] = await this.database.userModel.find({UserId : UserId,UserType : UserType});
            UserPushInterface.forEach((element) => {
                if (element) {
                    let notificationTitle:string = "";
                    notificationTitle = "Dear user";
                    if(element.UserType == 0){
                        HttpRequest.SendFCMMessageV1(process.env.SERVERKEY,
                            element.Token, notificationTitle, Message, Channel,PushType);
                    } else {
                        HttpRequest.SendFCMMessageV1(process.env.DRIVERSERVERKEY,
                            element.Token, notificationTitle, Message, Channel,PushType);
                    }   
                }
            });
            return h.response({ statusCode:200, Result: true }).code(200);
        } catch (error) {
            return Boom.badImplementation(error);
        }
    }
    public async PushNotificationComplex(request: IPushSendRequestComplex, h: Hapi.ResponseToolkit) {
        try {
            let { driverid, pickuplongitude,pickuplatitude,dropoflongitude,dropoflatitude,rating,name,price,pickupLocationTitle,dropofLocationTitle,Channel,Message,orderid,userid, pushRecieverId, UserType, PushType } = request.payload;
            let UserPushInterface: UserPushInterface[] = await this.database.userModel.find({UserId : pushRecieverId, UserType: UserType});
            UserPushInterface.forEach((element) => {
                if (element) {
                    let notificationTitle:string = "";
                    if (Channel.indexOf("121") > -1) {
                        let MessageObj = JSON.parse(Message);
                        notificationTitle = MessageObj.senderUserName;

                        //HttpRequest.SendFCMMessage(process.env.SERVERKEY,element.Token, notificationTitle, Message, Channel);
                        //HttpRequest.SendFCMMessage(process.env.DRIVERSERVERKEY,element.Token, notificationTitle, Message, Channel);

                    } else {
                        notificationTitle = "New request recieved";
                        if(element.UserType == 0){
                            HttpRequest.SendFCMMessageLiveTracking(process.env.SERVERKEY,element.Token, notificationTitle, Message, Channel, userid, orderid, driverid, pickuplongitude,pickuplatitude,dropoflongitude,dropoflatitude,rating,name,price,pickupLocationTitle,dropofLocationTitle, pushRecieverId, PushType);
                        } else {
                            HttpRequest.SendFCMMessageLiveTracking(process.env.DRIVERSERVERKEY,element.Token, notificationTitle, Message, Channel, userid, orderid, driverid, pickuplongitude,pickuplatitude,dropoflongitude,dropoflatitude,rating,name,price,pickupLocationTitle,dropofLocationTitle, pushRecieverId, PushType);
                        }
                    }
                    //Jugaar to manage user or driver
                    
                }
            });
            return h.response({ statusCode:200, Result: true }).code(200);
        } catch (error) {
            return Boom.badImplementation(error);
        }
    }
    // public async getAllMessagesWithPaggingMobile(request: IUserUpdateRequest, h: Hapi.ResponseToolkit) {
    //     return new Promise((resolve, reject) => {
    //         try {
    //             let userId: number = request.payload.id;
    //             let userName: string = request.payload.userName;
    //             let profileImage: string = request.payload.profileImage;

    //             redisClient.LLEN(channel, (err, totalrecords) => {
    //                 if (err) {
    //                     resolve(h.response({ MessageList: null, statusCode: 404 }).code(200));
    //                 }
    //                 let startindex: number = totalrecords < pageEndno ? 0 : totalrecords - pageEndno * (pageStartNo + 1);
    //                 let endindex: number = totalrecords < pageEndno ? -1 :
    //                     pageStartNo === 0 ? totalrecords : (totalrecords - pageEndno * (pageStartNo)) - (pageStartNo > 0 ? 1 : 0);

    //                 let hasPreviousMessages: boolean = startindex > 0;

    //                 if (endindex < -1 && totalrecords >= pageEndno || totalrecords === 0) {
    //                     var emptyArray = [];
    //                     resolve(h.response({ MessageList: emptyArray, statusCode: 200 }).code(200));
    //                 } else {
    //                     redisClient.lrange(channel, startindex < 0 ? 0 : startindex, endindex, (error, messageJSON) => {
    //                         if (err) {
    //                             resolve(h.response({ MessageList: null, statusCode: 404 }).code(200));
    //                         }
    //                         //if (messageJSON) {
    //                         resolve(h.response({
    //                             hasPreviousMessages: hasPreviousMessages,
    //                             MessageList: messageJSON, totalrecords: totalrecords, statusCode: 200
    //                         }).code(200));
    //                         //} else {
    //                         // resolve(h.response({hasPreviousMessages:hasPreviousMessages,
    //                         //     MessageList:messageJSON, totalrecords:totalrecords, statusCode:200}).code(200));
    //                         // }
    //                     });
    //                 }
    //             });
    //         } catch (error) {
    //             resolve(Boom.badImplementation(error));
    //             reject(error);
    //         }
    //     });
    // }

    // public async updateUser(request: IRequest, h: Hapi.ResponseToolkit) {
    //     const id = request.auth.credentials.id;

    //     try {
    //         let user: IUser = await this.database.userModel.findByIdAndUpdate(
    //             id,
    //             { $set: request.payload },
    //             { new: true }
    //         );
    //         return user;
    //     } catch (error) {
    //         return Boom.badImplementation(error);
    //     }
    // }

    // public async deleteUser(request: IRequest, h: Hapi.ResponseToolkit) {
    //     const id = request.auth.credentials.id;
    //     let user: IUser = await this.database.userModel.findByIdAndRemove(id);

    //     return user;
    // }

    // public async infoUser(request: IRequest, h: Hapi.ResponseToolkit) {
    //     const id = request.auth.credentials.id;
    //     let user: IUser = await this.database.userModel.findById(id);

    //     return user;
    // }
}
