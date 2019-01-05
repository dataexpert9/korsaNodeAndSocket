import * as EnumerationObject  from "../helper/enumerations";

export class LocationModel {  
  latitude: number;
  longitude: number;
  dropoflatitude: number;
  dropoflongitude: number;
  channel : string;
  locationType : EnumerationObject.LocationSendingType;
  userData : UserModel;
  orderid : number;
  direction : number;
  distance:number;
  numberofdrivers:number;
  price : number;
  pickupLocationTitle : string;
  dropofLocationTitle : string;
  driverid : number;
  gender: number;
  vehicalType: number;
  isCash:boolean
  }

  export class UserModel {
    userId: number;
    userName: string;
    userType: EnumerationObject.UserRole;
    rating: number;
  }

  export class LocationViewModel {  
    latitude: number;
    longitude: number;
    channel : string;
    locationType : EnumerationObject.LocationSendingType;
    userData : UserModel;
    orderid : number;
    heading : number;
    distance: string;
    duration: string;
    gender: number;
    vehicalType: number;
    isCash:boolean;
    }

    export class IdsList {
      Id: number;
    }

    export class NotifyDriver {
      driverid:number;
      orderid:number;
      price : number;
      pickupLocationTitle : string;
      dropofLocationTitle : string;
      rating: number;     
      name: string; 
      pickuplatitude: number;
      pickuplongitude: number;
      dropoflatitude: number;
      dropoflongitude: number;
      userid: number;
    }

    export class ClosePopupModel {
      orderid: number;
      showpopup: boolean;
    }

    export class driverAcceptedModel{
      userid: number;
      driverid: number;
      orderid: number;
    }

  