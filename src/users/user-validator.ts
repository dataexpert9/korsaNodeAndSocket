import * as Joi from "joi";

export const createUserModel = Joi.object().keys({
    email: Joi.string().email().trim().required(),
    name: Joi.string().required(),
    password: Joi.string().trim().required()
});

export const updateUserModel = Joi.object().keys({
    email: Joi.string().email().trim(),
    name: Joi.string(),
    password: Joi.string().trim()
});

export const loginUserModel = Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().trim().required(),
    userType: Joi.number().required()
});

export const PushModel = Joi.object().keys({
    UserId:  Joi.number().required(),
    UDID: Joi.string().trim().required(),
    Token: Joi.string().trim().required(),
    UserType:  Joi.number().required(),
});

export const PushSendModel = Joi.object().keys({
    UserId:  Joi.number().required(),
    Message: Joi.string().trim().required(),
    Channel: Joi.string().trim().required(),
    PushType: Joi.string().trim().required(),
    UserType: Joi.number().required(),
});

export const PushSendModelMessageRecieved = Joi.object().keys({
    UserId:  Joi.number().required(),
    Message: Joi.string().trim().required(),
    Channel: Joi.string().trim().required(),
    PushType: Joi.string().trim().required(),
    userType: Joi.number().required(),
    senderId:Joi.number().required(),
    senderName: Joi.string().trim().required(),
});

export const PushSendModelV2 = Joi.object().keys({
    UserId:  Joi.number().required(),
    Message: Joi.string().trim().required(),
    Channel: Joi.string().trim().required(),
    PushType: Joi.string().trim().required(),
    UserType: Joi.number().required(),
});

export const PushSendModelComplex = Joi.object().keys({
    orderid:  Joi.number().required(),
    price:  Joi.number().required(),
    driverid:  Joi.number().required(),
    pickupLocationTitle: Joi.string().trim().required(),
    dropofLocationTitle: Joi.string().trim().required(),
    rating:  Joi.number().required(),
    name: Joi.string().trim().required(),
    pickuplatitude:  Joi.number().required(),
    pickuplongitude:  Joi.number().required(),
    dropoflatitude:  Joi.number().required(),
    dropoflongitude:  Joi.number().required(),
    userid:  Joi.number().required(),
    Message: Joi.string().trim().required(),
    Channel: Joi.string().trim().required(),
    pushRecieverId: Joi.number().required(),
    UserType: Joi.number().required(),
    PushType: Joi.string().trim().required(),
});   

export const jwtValidator = Joi.object({'authorization': Joi.string().required()}).unknown();