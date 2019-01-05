import * as SocketIO from 'socket.io';
import { IMessage, IMessageViewModel } from '../model/Message';
import { ChatRequest, ChatRequestViewModel, HeartBeatViewModel, UserViewModel } from '../model/ChatRequest';
import { MessageSendingType, MessageStatusType, MessageDeliveryType } from '../helper/enumerations';
import * as moment from 'moment';
import { ConstentsVariable } from '../helper/constents';
import { func } from '../../node_modules/@types/joi';
import { HttpRequest } from '../helper/request';
import * as Configs from "../configurations";
import { LocationModel, UserModel, LocationViewModel, IdsList, driverAcceptedModel, ClosePopupModel, NotifyDriver } from '../model/LocationModel';
import {  IDriverDBModel } from '../interfaces/request';
import { debug } from 'util';
import { DriverModel, DriverISchema } from '../messages/messages';
import * as Mongoose from "mongoose";
var url   = require('url');

let _pub = require('redis-connection')();
let _sub = require('redis-connection')('subscriber');
let _io: any;
let ConnectionList: SocketIO = [];

let locationResponse : LocationViewModel[] = [];
let locationResponsev1 : IdsList[] = [];

var redisURL = url.parse(process.env.REDISCLOUD_URL);
var redis = require('redis'),
    client = redis.createClient(redisURL.port,redisURL.hostname,{});
var geo = require('georedis').initialize(client);
var mongoose = require('mongoose');
//Set up default mongoose connection
var DataBaseConfig = Configs.getDatabaseConfig();
//var mongoDB = DataBaseConfig.connectionString 'mongodb://localhost:27017/RouterBikeLiveTracking';
mongoose.connect(DataBaseConfig.connectionString);
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
var dbConn = mongoose.connection;


export function init(listener: any, callback) {
    try {
        
        _pub.on('ready', function () {
            // console.log("PUB Ready!");
            _sub.on('ready', function () {
                // now start the socket.io
                _io = SocketIO.listen(listener);
                //io.set('origins', '*');
                _io.on('connection', chatHandler);
                // Here's where all Redis messages get relayed to Socket.io clients
                _sub.on('message', function (channel, message) {
                    // console.log(channel + ' : ' + message);
                    _io.emit(channel, message); // relay to all connected socket.io clients
                });

                return setTimeout(function () {
                    return callback();
                }, 300); // wait for socket to boot
            });
        });
    } catch (err) {
        console.log('Error starting server: ', err);
        throw err;
    }
}

function chatHandler(socket: SocketIO): void {
    try {

        //Send Message
        socket.on('io:sendmessage', MessageCallBack);
        console.log(socket.id);
        socket.on('io:sendmessageagent', AgentMessageCallBack);

        socket.on("subscribe:channel", function (data) {
            if (data) {
                _sub.unsubscribe(data);
                _sub.subscribe(data);
                console.log("subscribed channel");
                console.log(data);
            } else {
                console.log("empty channel -> "+ data);
            }
        });
        //On Error
        socket.on('error', function (error) {
            throw error;
        });

        socket.on('disconnect', function () {

            UserStatus(socket, true);
            console.log("disconnected "+socket.id);
        });

        //Generate Request
        socket.on("requestgenerated:channel", RequestGenerated);
        //Generate Agent Request
        socket.on("agentrequestgenerated:channel", AgentRequestGenerated);
        //Accept Request For Agent
        socket.on("agentrequestaccepted:channel", AgentRequestAcceptedCallBack);
        //Accept Request For 1On1
        socket.on("requestaccepted:channel", RequestAcceptedCallBack);
        // Mark Message Delivered
        socket.on('agentmarkasdelivered:channel', AgentMarkMessageDelivered);
        //Heart Beat
        socket.on('heartbeatListener', HeartBeatListner);

        // Live Tracking Part

        //Recieve and Add to Redis Driver Location       
        socket.on('io:updatedriverlocation', UpdateDriverLocation);        
        //Recieve and Add to Redis Driver Location       
        socket.on('io:updateriderlocation', UpdateRiderLocation);     
        // Start Ride POrotocol
        socket.on('io:startridenow',StartSendingNotificationtoDrivers);
        // Remove Driver Data / Location from Redis   
        socket.on('io:setdriveroffline', SetDriverOffline);     
        // Inform User that Drivers has accepted the request   
        socket.on('io:driveracceptedrequest', DriverAcceptedRequest);  
         // Inform User that Drivers has arrived  
         socket.on('io:driverhasarived', DriverHasArived);     
        // close request popup from all drivers 
        socket.on('io:voidrequestforalldriversv1', VoidRequestforAlLDriversV1);    
        // Start One to One Location Transfer    
        socket.on('io:onetonelocationfetch', OneToOneLocationFetch);
        // Start Ride
        socket.on('io:startride',DriverHasStartedRide);
        // End Ride    
        socket.on('io:endride', EndCurrentRide);
        // Driver Cancels Request
        socket.on('io:drivercancelride', DriverCancelRide);
        // User Cancels Request
        socket.on('io:usercancelride', UserCancelRide);
        //-- Live TRacking Ends

        // Admin Chat
        socket.on('io:AdminChatGeneric', AdminMessageCallBack);

        // Admin Chat Send To App
        socket.on('io:AdminChatSendToApp', AdminMessageToAppCallBack);

        //Recieve and Add to Redis Driver Location       
        socket.on('io:GetAllDriversAdmin', UpdateRiderLocation); 

        socket.on('userstatus', function () {
            UserStatus(socket, false);
        });

        UserStatus(socket, false);

    } catch (ex) {
        console.log(ex);
    }
}


function UserStatus(socket: SocketIO, isOffline: boolean): void {
    ConnectionList = [];
    for (var i in socket.server.sockets.connected) {
        if (socket.server.sockets.connected.hasOwnProperty(i)) {
            var s = socket.server.sockets.connected[i];
            let connect = ConnectionList.find(x => x.handshake.query.user_id === s.handshake.query.user_id);
            if (!connect) {
                ConnectionList.push(s);
            }
        }
    }

    //Socket Managements HeartBeat
    let connectedSocket = null;
    if (ConnectionList.length > 0) {
        connectedSocket = ConnectionList.find(x => x.handshake.query.user_id === socket.handshake.query.user_id);
    }

    if (connectedSocket) {
        ConnectionList = ConnectionList.filter((el) => socket.handshake.query.user_id !== el.handshake.query.user_id);
        if (isOffline) {
            ConnectionList.pop(socket);
        } else {
            ConnectionList.push(socket);
        }
    } else {
        if (!isOffline) {
            ConnectionList.push(socket);
        }
    }
    let onlineUserList = [];
    ConnectionList.forEach(connection => {
        if (connection.handshake && connection.handshake.query.user_id !== undefined) {
            onlineUserList.push({ userId: connection.handshake.query.user_id, onlineStatus: true });
        }
    });
    // if (onlineUserList && onlineUserList.length > 0) {
    socket.server.sockets.emit(ConstentsVariable._heartBeatLiveUser, onlineUserList);
    //  }
}

function HeartBeatListner(heartBeatListner: HeartBeatViewModel): void {
    let channel = ConstentsVariable._heartBeatListner + heartBeatListner.sender_id;
    var dataOpponent = {
        reciever_username: heartBeatListner.sender_username,
        receiver_id: heartBeatListner.sender_id,
        sender_username: heartBeatListner.reciever_username,
        sender_id: heartBeatListner.receiver_id,
        isAlive: heartBeatListner.isAlive
    };
    _pub.publish(channel, JSON.stringify(dataOpponent));
}

function MessageCallBack(messageObject: IMessageViewModel): void {
    let socket: SocketIO = this;
    try {
        let message: IMessage = {
            id: new Date().getUTCMilliseconds().toString(),
            message: Sanitise(messageObject.message),
            date: new Date(moment().toDate()),
            senderUserName: messageObject.senderUserName,
            senderUserId: messageObject.senderUserId,
            senderUserImage: messageObject.senderUserImage,
            isMedia: messageObject.mediaURL && messageObject.mediaURL.length > 0 ? true : false,
            mediaURL: messageObject.mediaURL,
            channel: messageObject.channel,
            messageType: messageObject.messageType,
            messageDeliveryStatus: MessageDeliveryType.delivered,
            messageStatusType: MessageStatusType.none,
            userType: messageObject.userType,
        };
        console.log("Socket Connected" + socket.client.conn.id);
        _pub.hget('people', socket.client.conn.id, (error, name) => {

            let messageString = '' + JSON.stringify(message) + '';
            if (messageObject.messageType === MessageSendingType.TEXT) {
                //SendPushNotification(messageString, messageObject.channel, messageObject.receiverUserId, socket);
                _pub.rpush(messageObject.channel, messageString);
            }
            _pub.publish(messageObject.channel, messageString);

        });
    } catch (ex) {
        throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
    }
}

function AgentMessageCallBack(messageObject: IMessageViewModel): void {
    let socket: SocketIO = this;
    let message: IMessage = {
        id: messageObject.id,
        message: Sanitise(messageObject.message),
        date: new Date(moment().toDate()),
        senderUserName: messageObject.senderUserName,
        senderUserId: messageObject.senderUserId,
        senderUserImage: messageObject.senderUserImage,
        isMedia: messageObject.mediaURL && messageObject.mediaURL.length > 0 ? true : false,
        mediaURL: messageObject.mediaURL,
        channel: messageObject.channel,
        messageType: messageObject.messageType,
        messageDeliveryStatus: MessageDeliveryType.delivered,
        messageStatusType: MessageStatusType.none,
        userType: messageObject.userType,
    };

    console.log("Socket Connected" + socket.client.conn.id);

    _pub.hget('people', socket.client.conn.id, (error, name) => {

        let messageString = '' + JSON.stringify(message) + '';
        if (messageObject.messageType === MessageSendingType.TEXT) {
            //PushNotification
            SendPushNotificationMessageReceived(message.message, messageObject.channel, messageObject.receiverUserId, socket, messageObject.userType, messageObject.receiverUserId,"messagerecieved",messageObject.senderUserName);
            _pub.rpush(messageObject.channel, messageString);
        }
        if (messageObject.receiverUserId && messageObject.channel.indexOf('121') > -1
         && messageObject.messageType === MessageSendingType.TEXT) {
            _pub.publish(messageObject.receiverUserId.toString(), messageString);
        }
        _pub.publish(messageObject.channel, messageString);

    });
}

function SendPushNotification(message: string, channel: string, receiverId: number, socket: SocketIO,userType: number): void {
     ConnectionList = [];
     for (var i in socket.server.sockets.connected) {
         if (socket.server.sockets.connected.hasOwnProperty(i)) {
             var s = socket.server.sockets.connected[i];
             let connect = ConnectionList.find(x => x.handshake.query.user_id === s.handshake.query.user_id);
             if (!connect) {
                 ConnectionList.push(s);
             }
         }
     }

    if (ConnectionList.length > 0 && receiverId) {
        var connectedSocket = ConnectionList.find(x => x.handshake.query.user_id === receiverId.toString());
        if (!connectedSocket) {
            let pushObj = {
                UserId: receiverId,
                Message: message,
                Channel: channel,
                userType: userType,
            };
            const dbConfigs = Configs.getServerConfigs();
            HttpRequest.postRequestWithBase(dbConfigs.hostname, dbConfigs.port,
                "/api/User/SendPushNotification", JSON.stringify(pushObj));
        }
    }
    _pub.rpush(channel, message);
}

function SendPushNotificationMessageReceived(messagestr: string, channel: string, receiverId: number, socket: SocketIO,userType: number, SenderId:number, pushType : string, senderName: string): void {
    //ConnectionList = [];
    //for (var i in socket.server.sockets.connected) {
     //   if (socket.server.sockets.connected.hasOwnProperty(i)) {
      //      var s = socket.server.sockets.connected[i];
      //      let connect = ConnectionList.find(x => x.handshake.query.user_id === s.handshake.query.user_id);
      //      if (!connect) {
      //          ConnectionList.push(s);
      //      }
      //  }
    //}

  // if (ConnectionList.length > 0 && receiverId) {
       var connectedSocket = false; // ConnectionList.find(x => x.handshake.query.user_id === receiverId.toString());
       if (!connectedSocket) {
           let pushObj = {
               UserId: receiverId,
               Message: messagestr,
               Channel: channel,
               userType: userType,
               senderId: SenderId,
               PushType: pushType,
               senderName: senderName,
           };
           const dbConfigs = Configs.getServerConfigs();
           HttpRequest.postRequestWithBase(dbConfigs.hostname, dbConfigs.port,
               "/api/User/SendPushNotificationMessageReceived", JSON.stringify(pushObj));
       }
   //}
   //_pub.rpush(channel, messagestr);
}

function RequestGenerated(requestModel: ChatRequestViewModel): void {
    let requestedChannel = ConstentsVariable._requestChannel + requestModel.sender_id;

    let request: ChatRequest = {
        reciever_username: requestModel.sender_username,
        receiver_id: requestModel.sender_id,
        sender_username: requestModel.reciever_username,
        sender_id: requestModel.receiver_id
    };

    let requestdata = '' + JSON.stringify(request) + '';

    _pub.LREM(requestedChannel, 0, requestdata);
    _pub.rpush(requestedChannel, requestdata);
    _pub.publish(requestedChannel, requestdata);
}

function AgentRequestGenerated(requestModel: ChatRequestViewModel): void {
    let request: ChatRequest = {
        reciever_username: requestModel.reciever_username,
        receiver_id: requestModel.receiver_id,
        sender_username: requestModel.sender_username,
        sender_id: requestModel.sender_id
    };

    let requestdata = '' + JSON.stringify(request) + '';

    _pub.LREM(ConstentsVariable._agentRequestChannel, 0, requestdata);
    _pub.rpush(ConstentsVariable._agentRequestChannel, JSON.stringify(request));
    _pub.publish(ConstentsVariable._agentRequestChannel, JSON.stringify(request));
}

function RequestAcceptedCallBack(requestModel: ChatRequestViewModel): void {
    //Create Requests
    let acceptedChannel = ConstentsVariable._userOneToOneAcceptChannel + requestModel.receiver_id;
    let acceptedChannelOpponent = ConstentsVariable._userOneToOneAcceptChannel + requestModel.sender_id;
    let requestChannel = ConstentsVariable._requestChannel;

    let requestOpponent: ChatRequest = {
        reciever_username: requestModel.sender_username,
        receiver_id: requestModel.sender_id,
        sender_username: requestModel.reciever_username,
        sender_id: requestModel.receiver_id
    };

    let request: ChatRequest = {
        reciever_username: requestModel.reciever_username,
        receiver_id: requestModel.receiver_id,
        sender_username: requestModel.sender_username,
        sender_id: requestModel.sender_id
    };

    let requestdata = JSON.stringify(request);
    let requestdataOpponent = JSON.stringify(requestOpponent);

    //Remove Channel From Request
    _pub.LINDEX(requestChannel, requestModel.index, function (err, result) {
        if (result) { _pub.LREM(requestChannel, 0, result); }
    });

    //Remove Channel if exist From Accept
    if (request) {
        _pub.LREM(acceptedChannel, 0, '' + JSON.stringify(request) + '');
        _pub.LREM(acceptedChannelOpponent, 0, '' + JSON.stringify(requestOpponent) + '');
    }

    //Add/Push Channel in Accept Request
    _pub.rpush(acceptedChannel, requestdata);
    _pub.rpush(acceptedChannelOpponent, requestdataOpponent);

    //Publish added channel for both request
    _pub.publish(acceptedChannelOpponent, requestdataOpponent);
    _pub.publish(acceptedChannel, requestdata);
}

function AgentRequestAcceptedCallBack(requestModel: ChatRequestViewModel): void {
    //Create Requests
    let acceptedChannel = ConstentsVariable._agentAcceptChannel + requestModel.receiver_id;
    let acceptedChannelOpponent = ConstentsVariable._agentAcceptChannelOpponent + requestModel.sender_id;
    let requestChannel = ConstentsVariable._agentRequestChannel;

    let requestOpponent: ChatRequest = {
        reciever_username: requestModel.sender_username,
        receiver_id: requestModel.sender_id,
        sender_username: requestModel.reciever_username,
        sender_id: requestModel.receiver_id
    };

    let request: ChatRequest = {
        reciever_username: requestModel.reciever_username,
        receiver_id: requestModel.receiver_id,
        sender_username: requestModel.sender_username,
        sender_id: requestModel.sender_id
    };

    let requestdata = JSON.stringify(request);
    let requestdataOpponent = JSON.stringify(requestOpponent);

    //Remove Channel From Request
    _pub.LINDEX(requestChannel, requestModel.index, function (err, result) {
        if (result) { _pub.LREM(requestChannel, 0, result); }
    });

    //Remove Channel if exist From Accept
    if (request) {
        _pub.LREM(acceptedChannel, 0, '' + JSON.stringify(request) + '');
        _pub.LREM(acceptedChannelOpponent, 0, '' + JSON.stringify(requestOpponent) + '');
    }

    //Add/Push Channel in Accept Request
    _pub.rpush(acceptedChannel, requestdata);
    _pub.rpush(acceptedChannelOpponent, requestdataOpponent);

    //Publish added channel for both request
    _pub.publish(acceptedChannelOpponent, requestdataOpponent);
    _pub.publish(acceptedChannel, requestdata);
}

function AgentMarkMessageDelivered(messageObject: IMessageViewModel): void {
    let message: IMessage = {
        id: messageObject.id,
        message: messageObject.message,
        date: messageObject.date,
        senderUserName: messageObject.senderUserName,
        senderUserId: messageObject.senderUserId,
        senderUserImage: messageObject.senderUserImage,
        isMedia: messageObject.isMedia,
        mediaURL: messageObject.mediaURL,
        channel: messageObject.channel,
        messageType: messageObject.messageType,
        messageDeliveryStatus: MessageDeliveryType.seen,
        messageStatusType: MessageStatusType.none,
        userType: messageObject.userType,
    };

    let messagedata = '' + JSON.stringify(message) + '';
    _pub.LSET(messageObject.channel, messageObject.index, messagedata);
    _pub.publish(messageObject.channel, messagedata);
}

/* Live Tracking Started */

async function  GetDirectionResult(url:string){
    return await HttpRequest.getRequest(url,"");
}

function UpdateDriverLocation(locationObject: any) {
    
    // let socket: SocketIO = this;
    try {
        geo.addLocation(locationObject.userData.userId , { latitude: locationObject.latitude, longitude: locationObject.longitude }, function (err, reply) {
            if (err) {
                console.error(err);
            } else {
                
                if(reply < 1){
                    geo.updateLocation(locationObject.userData.userId , { latitude: locationObject.latitude, longitude: locationObject.longitude }, function(err, reply){
                        if(err) console.error(err)
                        else console.log('updated location:', locationObject.userData.userId + reply)
                    });
                }

            var driverid = locationObject.userData.userId;                
            
            // var driver = Mongoose.model('Driver', DriverISchema);
            DriverModel.findOne({"userid":driverid}).exec(function(err, driverloc) {
                    if (err) throw err;
                    //console.log("driver fetched");
                    if(driverloc){
                        DriverModel.findByIdAndUpdate(driverloc._id, 
                        { direction:  locationObject.direction, Gender:0, VehicalType:0, IsCash:false}, 
                        function(err, driverupdated) {
                            if (err) throw err;                    
                            //console.log(driverupdated);
                    });
                    } else {
                        var newdriver = new DriverModel();
                        newdriver.direction = locationObject.direction;
                        newdriver.userid = driverid.toString();
                        newdriver._id = new mongoose.Types.ObjectId();   
                        newdriver.Gender = locationObject.gender;
                        newdriver.IsCash = locationObject.isCash;
                        newdriver.VehicalType = locationObject.vehicalType;                 
                        newdriver.save();
                    }
                });         

            
            console.log('added location:', reply);
            }
        });
    } catch (ex) {
        console.log(ex);
        // throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
    }
}

function UpdateRiderLocation(locationObject: LocationModel) {
    let socket: SocketIO = this; 
    try {
        var options = {
            withCoordinates: true, // Will provide coordinates with locations, default false
            withHashes: true, // Will provide a 52bit Geohash Integer, default false
            withDistances: true, // Will provide distance from query, default false
            order: 'ASC', // or 'DESC' or true (same as 'ASC'), default false
            units: 'km', // or 'km', 'mi', 'ft', default 'm'
            count: 300, //locationObject.numberofdrivers, // Number of results to return, default undefined
            accurate: true, // Useful if in emulated mode and accuracy is important, default false
            direction:true,
        }
        var radius = (locationObject.distance > 0 ? locationObject.distance : 10);
        var chanelid = "listendriverlocations:"+locationObject.userData.userId.toString();
        geo.nearby({ latitude: locationObject.latitude, longitude: locationObject.longitude }, radius, options, function (err, locations) {
            if (err) {
                console.error(err);
            } else {                
               // console.log(locations); 
               if(locations.length > 0){
                var DriverListObject  = populateDriverObject(locations,locationObject); 
                    
                    DriverListObject.then(function(fetchedLocations:any){
                        //console.log(locationResponse); 
                        var FoundDrivers = fetchedLocations.Result.slice(0,15);
                        let locationString = '' + JSON.stringify(FoundDrivers) + '';
                        console.log(locationString);
                        _pub.publish(chanelid, locationString);
                        locationResponse = []; 
                    });
                    DriverListObject.catch(function(){
                        var emptyarray = [];
                        let locationString = '' + JSON.stringify(emptyarray) + '';
                        _pub.publish(chanelid, locationString);
                        locationResponse = []; 
                    });
                } else {
                        locationResponse = []; 
                        let locationString1 = '' + JSON.stringify(locationResponse) + '';
                        console.log(locationString1);
                        _pub.publish(chanelid, locationString1);                        
                }
            }
        });
    } catch (ex) {
        console.log('Exception occured : ', ex);
        //throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
    }
}

function StartSendingNotificationtoDrivers(locationObject: LocationModel) {
    let socket: SocketIO = this; 
    try {
        var options = {
            withCoordinates: true, // Will provide coordinates with locations, default false
            withHashes: true, // Will provide a 52bit Geohash Integer, default false
            withDistances: true, // Will provide distance from query, default false
            order: 'ASC', // or 'DESC' or true (same as 'ASC'), default false
            units: 'km', // or 'km', 'mi', 'ft', default 'm'
            count: locationObject.numberofdrivers, // Number of results to return, default undefined
            accurate: true, // Useful if in emulated mode and accuracy is important, default false
            direction:true,
        }
        var radius = (locationObject.distance > 0 ? locationObject.distance : 15);

        geo.nearby({ latitude: locationObject.latitude, longitude: locationObject.longitude }, radius, options, function (err, locations) {
            if (err) {
                console.error(err);
            } else {                
                locations.forEach(element => {
                    var currentUser : IdsList = new IdsList();
                    var _NotifyDriver : NotifyDriver = new NotifyDriver();
                    var chanelid = "io:notifydriverforrequest:"+element.key;
                    _NotifyDriver.driverid = element.key;
                    _NotifyDriver.orderid = locationObject.orderid;
                    _NotifyDriver.dropofLocationTitle = locationObject.dropofLocationTitle;
                    _NotifyDriver.pickupLocationTitle = locationObject.pickupLocationTitle;
                    _NotifyDriver.price = locationObject.price;
                    _NotifyDriver.rating = locationObject.userData.rating;
                    _NotifyDriver.name = locationObject.userData.userName;
                    _NotifyDriver.dropoflatitude = locationObject.dropoflatitude
                    _NotifyDriver.dropoflongitude = locationObject.dropoflongitude;
                    _NotifyDriver.pickuplatitude = locationObject.latitude;
                    _NotifyDriver.pickuplongitude = locationObject.longitude;
                    _NotifyDriver.userid = locationObject.userData.userId;
                    let locationStringNotify = '' + JSON.stringify(_NotifyDriver) + '';                      
                    
                    //  -------  check if socket connected or not
                    SendPushNotificationv1("You have received a request","chanel",socket,_NotifyDriver,1,"newrequest");

                    _pub.publish(chanelid, locationStringNotify);
                    currentUser.Id = parseInt(element.key);
                    locationResponsev1.push(currentUser); 
                }); 

                var chanelid1 = "fetchandstoredriverids:"+locationObject.userData.userId.toString();
                //console.log(locationResponsev1); 
                let locationString1 = '' + JSON.stringify(locationResponsev1) + '';
                console.log(locationString1);
                _pub.publish(chanelid1, locationString1);
                locationResponsev1 = []; 
            }
        });
    } catch (ex) {
        console.log('Exception occured : ', ex);
        //throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
    }
}

function populateDriverObject(locations: any,locationObject: any) {
    return new Promise((resolve, reject) => {
        var ind = 1;
        locations.forEach(element => {            
            var currentObjetc : LocationViewModel = new LocationViewModel();
            var currentUser : UserModel = new UserModel();
           
            //populating Object
            currentObjetc.latitude = element.latitude;
            currentObjetc.longitude = element.longitude;
            currentUser.userId = element.key;
            currentObjetc.userData = currentUser; 
            currentObjetc.distance =  element.distance;      
            currentObjetc.heading = 1;  
            var dd = fetchDirection(element.key,locationObject.isCash,locationObject.vehicalType);
            dd.then(function(returnValue:any){
                currentObjetc.heading = returnValue.Result.direction;
                currentObjetc.gender =  returnValue.Result.gender;
                currentObjetc.isCash =  returnValue.Result.iscash;
                currentObjetc.vehicalType =  returnValue.Result.vehicaltype;
                console.log("fetched location from mongo");
                // Check if to filter by Bike ID
                console.log("Array Updated");
                if(locationObject.gender == 2){
                    locationResponse.push(currentObjetc);
                } else if(locationObject.gender < 2 && locationObject.gender == returnValue.Result.gender){
                    locationResponse.push(currentObjetc);
                }
                //locationResponse.push(currentObjetc);
                if(ind == locations.length){
                    console.log("returned result");
                    resolve({ Result: locationResponse }); 
                }
                ind++;
            });           
            
        }); 
                  
    });

}



function SetDriverOffline(locationObject: LocationModel) {

    // let socket: SocketIO = this;
    try {
        var driverid = locationObject.userData.userId;
        geo.removeLocation(driverid, function(err, reply){
            if(err) console.error(err)
            else console.log('removed location:', reply)
          });        
    } catch (ex) {
        console.log(ex);
        // throw 'Error retrieving ' + socket.client.conn.id + ' from Redis :-( for: ' + "";
    }
}

function DriverAcceptedRequest(orderid:driverAcceptedModel){ 
    var driverobj : driverAcceptedModel = new driverAcceptedModel();
    driverobj.orderid = orderid.orderid;
    driverobj.driverid = orderid.driverid;
    driverobj.userid = orderid.userid;
    var chanelid = orderid.userid + ":notifyuserdriveraccepted:"+ orderid.orderid;
    var notifyuserString = '' + JSON.stringify(driverobj) + '';
    console.log("driver acpeted");
    console.log(chanelid);
    console.log(notifyuserString);
    _pub.publish(chanelid, notifyuserString);
    SendAcceptedPushtoUser(driverobj.orderid,driverobj.driverid,driverobj.userid)
}

function DriverHasArived(driverArivedObj:driverAcceptedModel){
    var chanelid = driverArivedObj.userid + ":notifyuserdriverhasarived:"+ driverArivedObj.orderid;
    var notifyuserString = '' + JSON.stringify("Driver Arived") + '';
    console.log("driver arived");
    console.log(notifyuserString);
    _pub.publish(chanelid, notifyuserString);
    sendGenericPush(driverArivedObj.userid,"Your driver has arived","user","driverhasarived",0);
}

function DriverHasStartedRide(driverArivedObj:driverAcceptedModel){
    var chanelid = driverArivedObj.userid + ":notifyuserdriverhasstarted:"+ driverArivedObj.orderid;
    var notifyuserString = '' + JSON.stringify("Driver Started") + '';
    console.log("driver Started");
    console.log(notifyuserString);
    _pub.publish(chanelid, notifyuserString);
    sendGenericPush(driverArivedObj.userid,"Driver has started the ride","user","ridehasstarted",0);
}

function VoidRequestforAlLDriversV1(driverList:any)
{
    console.log("popupclosed =>");
    console.log(driverList);
    var _drivers = driverList;
    //var orderid = driverList.orderid;
    _drivers.split(",").forEach(element => {
        var chanelid = element + ":closerequestpopup";
        var closepopupObj: ClosePopupModel = new ClosePopupModel();
        //closepopupObj.orderid = orderid;
        closepopupObj.showpopup = true;
        let closepopupString = '' + JSON.stringify(closepopupObj) + '';
        _pub.publish(chanelid, closepopupString);
    });
    
}

function OneToOneLocationFetch(locationObject: any){
    geo.location(locationObject.driverid, function(err, location){
        if(err){
             console.error(err);
        } else {
            console.log('OntoOne Location is : ', location.latitude, location.longitude);            
            var currentObjetcOnetoOne : LocationViewModel = new LocationViewModel();
            var currentUserOnetoOne : UserModel = new UserModel();            
            //populating Object
            currentObjetcOnetoOne.latitude = parseFloat(location.latitude);
            currentObjetcOnetoOne.longitude = parseFloat(location.longitude);
            currentUserOnetoOne.userId =  locationObject.driverid; // location.key;
            currentObjetcOnetoOne.userData = currentUserOnetoOne; 
            currentObjetcOnetoOne.distance =  location.distance;      
            currentObjetcOnetoOne.heading = 1; 
            currentObjetcOnetoOne.orderid = locationObject.orderid;

            fetchDirectionOneTOne(locationObject.driverid).then(function(direction:any){
                currentObjetcOnetoOne.heading = direction.Result; 
                var chanelid = locationObject.orderid.toString() + ":getonetoonelocation:"+locationObject.driverid.toString();
                //console.log(locationResponse); 
                let locationString = '' + JSON.stringify(currentObjetcOnetoOne) + '';
                console.log(locationString);
                _pub.publish(chanelid, locationString);

            }); 
        }
      })
}

function fetchDirection(_userid:string,_iscash:boolean,_vehicaltype:number){
    return new Promise((resolve, reject) => {
        DriverModel.findOne({"userid":_userid,"IsCash":_iscash,"VehicalType":_vehicaltype}).exec(function(err, driverloc) {
            if (err) throw err;
            if(driverloc){
                var driverObject = {
                    direction: driverloc.direction,
                    gender: driverloc.Gender,
                    iscash: driverloc.IsCash,
                    vehicaltype: driverloc.VehicalType
                }
                resolve({ Result: driverObject }); 
                //currentObjetc.heading = driverloc.direction;          
            } 
        });
    }); 
}

function fetchDirectionOneTOne(_userid:string){
    return new Promise((resolve, reject) => {
        DriverModel.findOne({"userid":_userid}).exec(function(err, driverloc) {
            if (err) throw err;
            if(driverloc){                
                resolve({ Result: driverloc.direction }); 
                //currentObjetc.heading = driverloc.direction;          
            } 
        });
    }); 
}

function EndCurrentRide(userid:number){
    console.log("ride end emited");
    var chanelid = userid + ":rideiscompleted";
    _pub.publish(chanelid, "Ride is Ended");
    sendGenericPush(userid,"Your current ride ended","user","rideended",0);
}

function DriverCancelRide(userid:number){
    console.log("ride end emited");
    var chanelid = userid + ":drivercanceledride";
    _pub.publish(chanelid, "Ride is Ended");
    sendGenericPush(userid,"Driver has cancelled the ride","user","drivercancelledride",0);
}


function UserCancelRide(driverid:number){
    console.log("ride end emited");
    var chanelid = driverid + ":usercanceledride";
    _pub.publish(chanelid, "Ride is Ended");
    sendGenericPush(driverid,"User has cancelled the ride","driver","usercancelledride",1);
}

/* Live Tracking Ends */

function Sanitise(text): string {
    let sanitised_text: string = text;
    /* istanbul ignore else */
    if (text.indexOf('<') > -1 /* istanbul ignore next */
        || text.indexOf('>') > -1) {
        sanitised_text = text.replace(/</g, '&lt').replace(/>/g, '&gt');
    }
    return sanitised_text;
}

function SendAcceptedPushtoUser(orderid:number,driverid:number,userid:number){
    let messageObj = JSON.stringify({message:"Driver has accepted your request"});
    
    let pushObj = {
        orderid: orderid,
        driverid: driverid,
        userid: userid,
        PushType: "driveraccepted",
        UserType: 0,
        Message: messageObj,
    };
    const dbConfigs = Configs.getServerConfigs();
    HttpRequest.postRequestWithBase(dbConfigs.hostname, dbConfigs.port,
        "/api/User/PushNotificationV2", JSON.stringify(pushObj));
}

function sendGenericPush(_UserId:number,_Message:string,_Channel:string, _PushType:string,_UserType:number){
    let messageObj = JSON.stringify({message:_Message}); 
    let pushObj = {
        UserId: _UserId,
        Message: messageObj,
        Channel: _Channel,
        PushType: _PushType,
        UserType: _UserType,
    };
    const dbConfigs = Configs.getServerConfigs();
    HttpRequest.postRequestWithBase(dbConfigs.hostname, dbConfigs.port,
        "/api/User/PushNotificationV1", JSON.stringify(pushObj));
}

function SendPushNotificationv1(message: string, channel: string, socket: SocketIO, _NotifyDriver:NotifyDriver, UserType:number,PushType:string): void {
    ConnectionList = [];
    for (var i in socket.server.sockets.connected) {
        if (socket.server.sockets.connected.hasOwnProperty(i)) {
            var s = socket.server.sockets.connected[i];
            let connect = ConnectionList.find(x => x.handshake.query.user_id === s.handshake.query.user_id);
            if (!connect) {
                ConnectionList.push(s);
            }
        }
    }

    if (ConnectionList.length > 0 && _NotifyDriver.driverid) {
        var connectedSocket = ConnectionList.find(x => x.handshake.query.user_id === _NotifyDriver.driverid);
        //if (!connectedSocket) {
            let pushObj = {
                orderid: _NotifyDriver.orderid,
                price: _NotifyDriver.price,
                driverid: _NotifyDriver.driverid,
                pickupLocationTitle: _NotifyDriver.pickupLocationTitle,
                dropofLocationTitle: _NotifyDriver.dropofLocationTitle,
                rating: _NotifyDriver.rating,
                name: _NotifyDriver.name,
                pickuplatitude: _NotifyDriver.pickuplatitude,
                pickuplongitude: _NotifyDriver.pickuplongitude,
                dropoflatitude: _NotifyDriver.dropoflatitude,
                dropoflongitude: _NotifyDriver.dropoflongitude,
                userid: _NotifyDriver.userid,
                pushRecieverId : _NotifyDriver.driverid,
                Message: message,
                Channel: channel,
                UserType: UserType,
                PushType: PushType,
            };
            const dbConfigs = Configs.getServerConfigs();
            HttpRequest.postRequestWithBase(dbConfigs.hostname, dbConfigs.port,
                "/api/User/SendPushNotificationLiveTracking", JSON.stringify(pushObj));
        //}
    }
    _pub.rpush(channel, message);
}

function AdminMessageCallBack(messageObject: any): void {
    let socket: SocketIO = this;
    let message: IMessage = {
        id: new Date().getUTCMilliseconds().toString(),
        message: Sanitise(messageObject.message),
        date: new Date(moment().toDate()),
        senderUserName: messageObject.senderUserName,
        senderUserId: messageObject.senderUserId,
        senderUserImage: messageObject.senderUserImage,
        isMedia: messageObject.mediaURL && messageObject.mediaURL.length > 0 ? true : false,
        mediaURL: messageObject.mediaURL,
        channel: messageObject.channel,
        messageType: messageObject.messageType,
        messageDeliveryStatus: MessageDeliveryType.delivered,
        messageStatusType: MessageStatusType.none,
        userType: messageObject.userType,
    };

    console.log("Socket Connected" + socket.client.conn.id);
    let messageString = '' + JSON.stringify(message) + '';
    _pub.rpush(messageObject.channel, messageString);
    // push to generic channel
    _pub.publish("AdminGenericChanel", messageString);
    
}
function AdminMessageToAppCallBack(messageObject: any): void {
    let socket: SocketIO = this;
    let message: IMessage = {
        id: new Date().getUTCMilliseconds().toString(),
        message: Sanitise(messageObject.message),
        date: new Date(moment().toDate()),
        senderUserName: messageObject.senderUserName,
        senderUserId: messageObject.senderUserId,
        senderUserImage: messageObject.senderUserImage,
        isMedia: messageObject.mediaURL && messageObject.mediaURL.length > 0 ? true : false,
        mediaURL: messageObject.mediaURL,
        channel: messageObject.channel,
        messageType: messageObject.messageType,
        messageDeliveryStatus: MessageDeliveryType.delivered,
        messageStatusType: MessageStatusType.none,
        userType: messageObject.userType,
    };

    console.log("Socket Connected" + socket.client.conn.id);
    let messageString = '' + JSON.stringify(message) + '';
    _pub.rpush(messageObject.channel, messageString);
    // push to generic channel
    _pub.publish(messageObject.channel, messageString);
    
}