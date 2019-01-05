import * as Hapi from 'hapi';
import { UserType } from '../helper/enumerations';
import { Double } from '../../node_modules/@types/bson';
import * as Mongoose from "mongoose";

export interface ICredentials extends Hapi.AuthCredentials {
  id: string;
}

export interface IRequestAuth extends Hapi.RequestAuth {
  credentials: ICredentials;
}

export interface IRequest extends Hapi.Request {
  auth: IRequestAuth;
}

export interface IPushRequest extends Hapi.Request {
  payload: {
    UserId: number;
    UDID: string;
    Token: string;
    UserType: number;
  };
}

export interface ILoginRequest extends IRequest {
  payload: {
    email: string;
    password: string;
    userType:number;
  };
}

export interface IPushSendRequest extends IRequest {
  payload: {
    UserId: number;
    Message: string;
    Channel:string;
    userType:number;
  };
}

export interface IPushSendRequestMessageRecieved extends IRequest {
  payload: {
    UserId: number;
    Message: string;
    Channel:string;
    userType:number;
    senderId:number;
    PushType:string;
    senderName:string;
  };
}

export interface IPushSendRequestV1 extends IRequest {
  payload: {
    UserId: number;
    Message: string;
    Channel:string;
    UserType:number;
    PushType:string;
  };
}

export interface IPushSendRequestV2 extends IRequest {
  payload: {
    driverid: number;
    userid:number;
    orderid:number;
    Message: string;
    Channel:string;
    UserType:number;
    PushType:string;
  };
}        

export interface IPushSendRequestComplex extends IRequest {
  payload: {
    driverid: number;
    Message: string;
    Channel:string;
    orderid:number;
    dropofLocationTitle:string;
    pickupLocationTitle:string;
    price:number;
    rating:number;
    name:string;
    dropoflatitude:number;
    dropoflongitude:number;
    pickuplatitude:number;
    pickuplongitude:number;
    userid:number;
    pushRecieverId:number;
    UserType:number;
    PushType:string;
  };
}                  

export interface IMessageListRequest extends IRequest {
  payload: {
    channel: string;
    currentPageNo: number;
    totalrecords:number;
  };
}

export interface IUserUpdateRequest extends IRequest {
  payload: {
    id: number;
    userName: string;
    profileImage:string;
  };
}

export interface IGetAllDriversRequest extends IRequest {
  payload: {
    latitude: number;
    longitude: number;
    name:string;
    bikeid:number;
    direction:number;
    distance:number;
    numberofdrivers:number;
  };
}
export interface IDriverDBModel extends Mongoose.Document {
  userid: string;
  direction: number;
}


export interface IMediaRequest extends IRequest {
  payload: {
  };
}

export interface IDriverDirectionUpdate extends IRequest {
  payload: {
    driverid: string;
    direction: number;
  };
}