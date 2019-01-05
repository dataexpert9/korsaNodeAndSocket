import * as Hapi from 'hapi';
import * as Boom from 'boom';
import * as fs from "fs";
import * as path from "path";
import { LocationModel,UserModel } from '../model/LocationModel';
import { IMessage } from '../model/Message';
import { IDatabase } from '../database';
import { IServerConfigurations } from '../configurations';
import { IRequest, IMessageListRequest, IMediaRequest,IGetAllDriversRequest, IDriverDBModel, IDriverDirectionUpdate } from '../interfaces/request';
import { ChatRequest } from '../model/ChatRequest';
import { ConstentsVariable } from '../helper/constents';
import * as nodeImageResizer from "node-image-resizer";
import { func } from '../../node_modules/@types/joi';
import { DriverModel } from './messages';
import { debug } from 'util';
var url   = require('url');

let redisClient = require('redis-connection')();

var redisURL = url.parse(process.env.REDISCLOUD_URL);
var redis = require('redis'),
    client = redis.createClient(redisURL.port,redisURL.hostname,{});
var geo = require('georedis').initialize(client);

export default class MessageController {
    private database: IDatabase;
    private configs: IServerConfigurations;

    constructor(configs: IServerConfigurations, database: IDatabase) {
        this.configs = configs;
        this.database = database;
    }

    public async GetAllNearByDrivers(request: IGetAllDriversRequest, h: Hapi.ResponseToolkit) {
        return new Promise((resolve, reject) => {
          
                var options = {
                    withCoordinates: true, // Will provide coordinates with locations, default false
                    withHashes: true, // Will provide a 52bit Geohash Integer, default false
                    withDistances: true, // Will provide distance from query, default false
                    order: 'ASC', // or 'DESC' or true (same as 'ASC'), default false
                    units: 'km', // or 'km', 'mi', 'ft', default 'm'
                    count: 10, // Number of results to return, default undefined
                    accurate: true // Useful if in emulated mode and accuracy is important, default false
                }
                var radius = 10;
                const { latitude, longitude } = request.payload;
                
                geo.nearby({ latitude: latitude, longitude: longitude }, radius, options, function (err, locations) {
                    if (err) {
                        console.error(err);
                        resolve(h.response({ statusCode:500, Result: err }).code(500));
                    } else {
                        console.log(locations);
                        //var chanelid = "listendriverlocations:"+request.userData.userId.toString();
                        let locationString = '' + JSON.stringify(locations) + '';
                        
                        resolve(h.response({ statusCode:200, Result: locationString }).code(200));
                    }
                });
                //resolve(h.response({ statusCode:500, Result: "" }).code(500));
            
        });

    }

    public async UpsertDriverDirection(driverupdaterequest: IDriverDirectionUpdate)
    {
        try {
            let driverid = driverupdaterequest.params['driverid'];
            let direction = driverupdaterequest.params['direction'];
            let driverdata: IDriverDBModel = await this.database.driverModel.findOne(
                {userid: driverid }
            );

            if (driverdata) {
                driverdata.direction = parseFloat(direction);
                let driverdata2: IDriverDBModel = await this.database.driverModel.findByIdAndUpdate(
                    { _id: driverdata._id },
                    { $set: driverdata }
                );
                return driverdata;
            } else {
                
                let driverdata1: IDriverDBModel = await this.database.driverModel.create({"userid" : driverid, "direction" : direction});
                if(driverdata1){
                    return driverdata1;
                }
                return Boom.notFound();
            }
        } catch (error) {
            return Boom.badImplementation(error);
        }
    }


    public async getAllMessagesWithPagging(request: IRequest, h: Hapi.ResponseToolkit) {
        return new Promise((resolve, reject) => {
            try {
                let channel: string = request.params['channel'];
                let pageStartNo: number = parseInt(request.params['currentPageNo'], 10);
                let pageEndno: number = parseInt(request.params['totalrecords'], 10);
                redisClient.LLEN(channel, (err, totalrecords) => {
                    if (err) {
                        resolve(h.response({ MessageList: null, statusCode: 404 }).code(200));
                    }
                    let startindex: number = totalrecords < pageEndno ? 0 : totalrecords - pageEndno * (pageStartNo + 1);
                    let endindex: number = totalrecords < pageEndno ? -1 :
                        pageStartNo === 0 ? totalrecords : (totalrecords - pageEndno * (pageStartNo)) - (pageStartNo > 0 ? 1 : 0);

                    let hasPreviousMessages: boolean = startindex > 0;

                    if (endindex < -1 && totalrecords >= pageEndno || totalrecords === 0) {
                        var emptyArray = [];
                        resolve(h.response({ MessageList: emptyArray, statusCode: 200 }).code(200));
                    } else {
                        redisClient.lrange(channel, startindex < 0 ? 0 : startindex, endindex, (error, messageJSON) => {
                            if (err) {
                                resolve(h.response({ MessageList: null, statusCode: 404 }).code(200));
                            }                           
                            
                            //if (messageJSON) {
                            resolve(h.response({
                                hasPreviousMessages: hasPreviousMessages,
                                MessageList: messageJSON, totalrecords: totalrecords, statusCode: 200
                            }).code(200));
                            //} else {
                            // resolve(h.response({hasPreviousMessages:hasPreviousMessages,
                            //     MessageList:messageJSON, totalrecords:totalrecords, statusCode:200}).code(200));
                            // }
                        });
                    }
                });
            } catch (error) {
                resolve(Boom.badImplementation(error));
                reject(error);
            }
        });
    }

    public async getAllMessagesWithPaggingV1(request: IRequest, h: Hapi.ResponseToolkit) {
        return new Promise((resolve, reject) => {
            try {
                let userType: string = request.params['userType'];
                let channel: string = request.params['channel'];
                let pageStartNo: number = parseInt(request.params['currentPageNo'], 10);
                let pageEndno: number = parseInt(request.params['totalrecords'], 10);
                redisClient.LLEN(channel, (err, totalrecords) => {
                    if (err) {
                        resolve(h.response({ MessageList: null, statusCode: 404 }).code(200));
                    }
                    let startindex: number = totalrecords < pageEndno ? 0 : totalrecords - pageEndno * (pageStartNo + 1);
                    let endindex: number = totalrecords < pageEndno ? -1 :
                        pageStartNo === 0 ? totalrecords : (totalrecords - pageEndno * (pageStartNo)) - (pageStartNo > 0 ? 1 : 0);

                    let hasPreviousMessages: boolean = startindex > 0;

                    if (endindex < -1 && totalrecords >= pageEndno || totalrecords === 0) {
                        var emptyArray = [];
                        resolve(h.response({ MessageList: emptyArray, statusCode: 200 }).code(200));
                    } else {
                        redisClient.lrange(channel, startindex < 0 ? 0 : startindex, endindex, (error, messageJSON) => {
                            if (err) {
                                resolve(h.response({ MessageList: null, statusCode: 404 }).code(200));
                            }
                            //if (messageJSON) {
                            resolve(h.response({
                                hasPreviousMessages: hasPreviousMessages,
                                MessageList: messageJSON, totalrecords: totalrecords, statusCode: 200
                            }).code(200));
                            //} else {
                            // resolve(h.response({hasPreviousMessages:hasPreviousMessages,
                            //     MessageList:messageJSON, totalrecords:totalrecords, statusCode:200}).code(200));
                            // }
                        });
                    }
                });
            } catch (error) {
                resolve(Boom.badImplementation(error));
                reject(error);
            }
        });
    }

    public async getAllMessagesWithPaggingMobile(request: IMessageListRequest, h: Hapi.ResponseToolkit) {
        return new Promise((resolve, reject) => {
            try {
                let channel: string = request.payload.channel;
                let pageStartNo: number = request.payload.currentPageNo;
                let pageEndno: number = request.payload.totalrecords;

                redisClient.LLEN(channel, (err, totalrecords) => {
                    if (err) {
                        resolve(h.response({ MessageList: null, statusCode: 404 }).code(200));
                    }
                    let startindex: number = totalrecords < pageEndno ? 0 : totalrecords - pageEndno * (pageStartNo + 1);
                    let endindex: number = totalrecords < pageEndno ? -1 :
                        pageStartNo === 0 ? totalrecords : (totalrecords - pageEndno * (pageStartNo)) - (pageStartNo > 0 ? 1 : 0);

                    let hasPreviousMessages: boolean = startindex > 0;

                    if (endindex < -1 && totalrecords >= pageEndno || totalrecords === 0) {
                        var emptyArray = [];
                        resolve(h.response({ MessageList: emptyArray, statusCode: 200 }).code(200));
                    } else {
                        redisClient.lrange(channel, startindex < 0 ? 0 : startindex, endindex, (error, messageJSON) => {
                            if (err) {
                                resolve(h.response({ MessageList: null, statusCode: 404 }).code(200));
                            }
                            //if (messageJSON) {
                            resolve(h.response({
                                hasPreviousMessages: hasPreviousMessages,
                                MessageList: messageJSON, totalrecords: totalrecords, statusCode: 200
                            }).code(200));
                            //} else {
                            // resolve(h.response({hasPreviousMessages:hasPreviousMessages,
                            //     MessageList:messageJSON, totalrecords:totalrecords, statusCode:200}).code(200));
                            // }
                        });
                    }
                });
            } catch (error) {
                resolve(Boom.badImplementation(error));
                reject(error);
            }
        });
    }

    public async UploadMedia(request: IMediaRequest, h: Hapi.ResponseToolkit) {
        return new Promise((resolve, reject) => {
            try {
                let result = [];
                let dirPath: string[] = __dirname.split(path.sep);
                let savePath: string = "";
                for (let i = 0; i < dirPath.length - 1; i++) {
                    if (i !== 0) {
                        savePath += "/" + dirPath[i];
                    } else {
                        savePath = dirPath[i];
                    }
                }
                console.log(savePath);
                for (var key in request.payload) {
                    if (request.payload.hasOwnProperty(key)) {
                        let uploadingArray = [];
                        if (!Array.isArray(request.payload[key])) {
                            uploadingArray.push(request.payload[key]);
                        } else {
                            uploadingArray = request.payload[key];
                        }
                        uploadingArray.forEach(element => {
                            let fileObj = element.hapi;
                            let imageExt: string = fileObj.headers["content-type"].toLowerCase();
                            let isImage: boolean = imageExt.indexOf("image") > -1 ? true : false;
                            let isVideo: boolean = imageExt.indexOf("video") > -1 ? true : false;
                            let isAudio: boolean = imageExt.indexOf("audio") > -1 ? true : false;
                            let isPdf: boolean = imageExt.indexOf("application/pdf") > -1 ? true : false;

                            let updatedFileName = new Date().getTime() + fileObj.filename;
                            if (!isImage && !isVideo && !isAudio && !isPdf) {
                                resolve(h.response({ Attachments: null, statusCode: 400,
                                    Message:"Please upload the correct format" }).code(200));
                            }
                            let imageObj = {
                                fileExtension: path.extname(fileObj.filename),
                                filePath: "/uploads/attachments/" + updatedFileName,
                                fileThumbnailPath: "/uploads/attachments/" + updatedFileName,
                                fileType: fileObj.headers["content-type"],
                            };
                            if (isImage) {
                                let  isGif = imageExt.indexOf("gif") > -1 ? true : false;
                                if (isGif) {
                                    element.pipe(fs.createWriteStream(
                                        savePath + "/uploads/attachments/" + updatedFileName));
                                    result.push(imageObj);
                                } else {
                                    const setup = {
                                        all: {
                                            path: savePath + "/uploads/attachments/",
                                            quality: 80
                                        },
                                        versions: [{
                                            quality: 100,
                                            prefix: 'small_',
                                            width: 100,
                                            height: 100
                                        }]
                                    };
                                    element.pipe(fs.createWriteStream(
                                        savePath + "/uploads/attachments/" + updatedFileName).on('finish', function () {
                                            nodeImageResizer(savePath
                                                + "/uploads/attachments/" + updatedFileName, setup).then((image) => {
                                                    imageObj.fileThumbnailPath = "/uploads/attachments/small_" + updatedFileName;
                                                    result.push(imageObj);
                                                    if (result.length === uploadingArray.length) {
                                                        resolve(h.response({ Attachments: result, statusCode: 200 }).code(200));
                                                    }
                                                });
                                        }).on('close', function () {
                                        }));
                                }
                            } else if (isVideo || isAudio || isPdf) {
                                if (isVideo) {
                                    imageObj.fileThumbnailPath = "/uploads/attachments/default_video.png";
                                } else if (isAudio) {
                                    imageObj.fileThumbnailPath = "/uploads/attachments/default_audio.png";
                                } else if (isPdf) {
                                    imageObj.fileThumbnailPath = "/uploads/attachments/default_pdf.png";
                                }
                                element.pipe(fs.createWriteStream(
                                    savePath + "/uploads/attachments/" + updatedFileName));
                                result.push(imageObj);
                            }
                            if (result.length === uploadingArray.length) {
                                resolve(h.response({ Attachments: result, statusCode: 200 }).code(200));
                            }
                        });
                    }
                }
                //resolve(h.response({ Attachments: result, statusCode: 200 }).code(200));
            } catch (error) {
                resolve(Boom.badImplementation(error));
                reject(error);
            }
        });
    }

    public async getAllRequestByChannel(request: IRequest, h: Hapi.ResponseToolkit) {
        return new Promise((resolve, reject) => {
            try {
                let channel: string = request.params['channel'];
                redisClient.lrange(channel, 0, -1, (error, messageJSON) => {
                    if (error) {
                        resolve(h.response({ RequestList: null, statusCode: 404 }).code(200));
                    }
                    if (messageJSON && messageJSON.length > 0) {
                        let gettingLastMessage = channel.indexOf("Accept:Subscribe") > -1 || channel.indexOf("Chat:Listing") > -1;
                        if (gettingLastMessage) {
                            let isOneOnOne = channel.indexOf("Chat:Listing") > -1;
                            this.AcceptedRequestRendering(messageJSON, channel, isOneOnOne).then(function (value) {
                                //resolve(h.response(value).code(200));
                                resolve(h.response({ RequestList: value, statusCode: 200 }).code(200));
                            });
                        } else { resolve(h.response({ RequestList: messageJSON, statusCode: 200 }).code(200)); }
                    } else {
                        resolve(h.response({ RequestList: messageJSON, statusCode: 200 }).code(200));
                    }
                });
            } catch (error) {
                resolve(Boom.badImplementation(error));
            }
        });
    }

    public AcceptedRequestRendering(channelData: Array<string>, acceptedChannelName: string, isOneOnOne: boolean) {
        return new Promise((resolve, reject) => {
            try {
                const start = async () => {
                    let newobj: Array<{}> = [];
                    await this.asyncForEach(channelData, async (requestelement) => {
                        let request: ChatRequest = JSON.parse(requestelement);
                        let userchannel: string = "";
                        if (!isOneOnOne) {
                            userchannel = request.sender_id + ConstentsVariable._agentChatChannel;
                        } else {
                            if (request.receiver_id > request.sender_id) {
                                userchannel = request.receiver_id + ConstentsVariable._userChatChannel + request.sender_id;
                            } else {
                                userchannel = request.sender_id + ConstentsVariable._userChatChannel + request.receiver_id;
                            }
                        }
                        let jsonObj = await this.acceptMessageCallback(userchannel, requestelement, acceptedChannelName);
                        if (jsonObj) {
                            newobj.push(jsonObj);
                        }
                    });
                    resolve(newobj);
                };
                start();
            } catch (ex) {
                reject(ex);
            }
        });
    }

    async acceptMessageCallback(userchannel, element, acceptedChannelName) {

        return new Promise((resolve, reject) => {
            try {
                redisClient.LINDEX(userchannel, -1, (index, obj) => {
                    let jsonData = {
                        request: element,
                        message: obj
                    };
                    if (obj) {
                        var lastmessageobj = JSON.parse(obj);
                        var dateobj = this.getDateByString(lastmessageobj.date);
                        var date = this.addMinutes(dateobj, 30);
                        // if (date <= new Date()) {
                        //     redisClient.LREM(acceptedChannelName, 0, element);
                        // }
                    }
                    resolve(jsonData);
                });
            } catch (ex) {
                reject(ex);
            }
        });
    }

    public getDateByString(dateString): Date {
        if (dateString) {
            try {
                dateString = dateString.replace("at", "");
                dateString = dateString.replace("st ", " ");
                dateString = dateString.replace("nd ", " ");
                dateString = dateString.replace("rd ", " ");
                dateString = dateString.replace("th ", " ");
                return new Date(dateString);
            } catch (ex) {
                console.log(ex);
            }
        }
        return new Date();
    }

    public async asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }

    public addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes * 60000);
    }
}
