import * as Joi from "joi";

export const createMessageModel = Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().required()
});

export const updateMessageModel = Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().required(),
    completed: Joi.boolean()
});

export const LocationOjectModel = Joi.object().keys({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    name: Joi.string().required(),
    bikeid: Joi.number().required(),
    direction: Joi.number().required()
});