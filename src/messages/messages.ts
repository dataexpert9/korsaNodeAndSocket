import * as Mongoose from "mongoose";
import * as Bcrypt from "bcryptjs";

export interface DriverModel extends Mongoose.Document {
  userid: string;
  direction: number;
  Gender: number,
  VehicalType: number,
  IsCash: boolean 
}

export const DriverISchema = new Mongoose.Schema(
  {
    userid: { type: String, unique: true, required: true },
    direction: { type: Number, required: true },
    Gender: { type: Number, default:0 },
    VehicalType: { type: Number, default:0 },
    IsCash: { type: Boolean, default:0 }    
  },
  {
    timestamps: true
  });
  export const DriverModel = Mongoose.model<DriverModel>('Driver', DriverISchema);