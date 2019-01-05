import * as MessageStatus  from "../helper/enumerations";

export class IMessage {
  id: string;
  message: string;
  date: Date;
  senderUserName: string;
  senderUserId : number;
  senderUserImage : string;
  isMedia : boolean;
  mediaURL : string;
  channel : string;
  messageType : MessageStatus.MessageSendingType;
  messageDeliveryStatus:MessageStatus.MessageDeliveryType;
  messageStatusType:MessageStatus.MessageStatusType;
  userType: number;
  }

  export class IMessageViewModel {
    id: string;
    message: string;
    date: Date;
    senderUserName: string;
    senderUserId : number;
    senderUserImage : string;
    isMedia : boolean;
    mediaURL : string;
    channel : string;
    messageType : MessageStatus.MessageSendingType;
    messageDeliveryStatus:MessageStatus.MessageDeliveryType;
    messageStatusType:MessageStatus.MessageStatusType;
    index:number;
    token:string;
    receiverUserId : number;
    userType: number;
  }