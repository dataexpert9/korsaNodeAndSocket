export class ChatRequest {
    sender_username: string;
    sender_id: number;
    reciever_username: string;
    receiver_id: number;
}

export class ChatRequestViewModel {
    sender_username: string;
    sender_id: number;
    reciever_username: string;
    receiver_id: number;
    index: number;
}

export class HeartBeatViewModel {
    sender_username: string;
    sender_id: number;
    reciever_username: string;
    receiver_id: number;
    isAlive: boolean;
}


export class UserViewModel {
    UserId: number;
    UserName: string;
    ProfileImage: string;
}