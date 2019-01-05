import * as Http from 'http';
import * as https from 'https';
import { IUser } from '../users/user';
import { func } from '../../node_modules/@types/joi';

export class HttpRequest {
  public static getRequest<T>(endpoint, dataObj: any) {
    Http.get(endpoint, (res) => {
      const { statusCode } = res;
      const contentType = res.headers['content-type'];

      let error;
      if (statusCode !== 200) {
        error = new Error('Request Failed.\n' +
          `Status Code: ${statusCode}`);
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error('Invalid content-type.\n' +
          `Expected application/json but received ${contentType}`);
      }

      if (error) {
        console.error(error.message);
        // consume response data to free up memory
        res.resume();
        return;
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          console.log(parsedData);
          return parsedData;
        } catch (e) {
          console.error(e.message);
        }
      });
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
    });
    return null;
  }

  public static postRequest<T>(endpoint, dataObj: any) {
    try {
      const options = {
        hostname: process.env.APIURL,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(dataObj)
        }
      };
      let user: IUser = null;
      const req = Http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          return rawData;
        });
      });
      req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
      });

      // write data to request body
      req.write(dataObj);
      req.end();
    } catch (ex) {
      return null;
    }
  }

  public static async postRequestWithBase<T>(baseURL, port, endpoint, dataObj: any) {
    try {
      const options = {
        hostname: baseURL,
        path: endpoint,
        port:port,
        method: 'POST',
        headers: {
          //'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataObj)
        }
      };
      let user: IUser = null;
      const req = Http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          return rawData;
        });
      });
      req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
      });

      // write data to request body
      req.write(dataObj);
      req.end();
    } catch (ex) {
      return null;
    }
  }

  public static postFormData(endpoint: string, formData: any) {
    return new Promise<any>((resolve, reject) => {
      try {
        var http = https;
        const request = http.request({
          method: 'POST',
          host: process.env.APIURL,
          path: endpoint,
          headers: formData.getHeaders()
        });
        formData.pipe(request);
        request.on('response', function (res) {
            if (res.statusCode < 200 || res.statusCode > 299) {
              resolve(null);
            }
            // temporary data holder
            const body = [];
            // on every content chunk, push it to the data array
            res.on('data', (chunk) => body.push(chunk));
            // we are done, resolve promise with those joined chunks
            res.on('end', () => {
              let response:any = JSON.parse(body.join(''));
              resolve(response);
            });
        });
      } catch (ex) {
        console.log(ex);
        reject(null);
      }
    });
  }

  public static SendFCMMessage(serverKey, deviceToken, Title, body, channel) {
    var FCM = require('fcm-node');
    var srvKey = serverKey;
    var fcm = new FCM(srvKey);
    let messageObj = JSON.parse(body);
    let messageText:string = "";
    try {
      // tslint:disable-next-line:no-eval
      messageText = eval("'" +  messageObj.message + "'");
    } catch (error) {
      messageText = messageObj.message;
    }
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: deviceToken,
        collapse_key: 'key',
        notification: {
            title: Title,
            body: messageText,
            sound: "default",
        },
        data: {  //you can send only notification or only data(or include both)
          title: Title,
          body: body ,
          sound: "default",
       }
    };

    fcm.send(message, function(err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
  }


  public static SendFCMMessageRecieved(serverKey, deviceToken, Title, body, channel,PushType,senderid) {
    var FCM = require('fcm-node');
    var srvKey = serverKey;
    var fcm = new FCM(srvKey);
   
    let messageText:string = body;
    
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: deviceToken,
        collapse_key: 'key',
        notification: {
            title: Title,
            body: messageText,
            sound: "default",
            pushtype: PushType,
            senderid:senderid,
        },
        data: {  //you can send only notification or only data(or include both)
          title: Title,
          body: messageText,
          sound: "default",
          pushtype: PushType,
          senderid:senderid,
       }
    };

    fcm.send(message, function(err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
  }

  public static SendFCMMessageV1(serverKey, deviceToken, Title, body, channel,PushType) {
    var FCM = require('fcm-node');
    var srvKey = serverKey;
    var fcm = new FCM(srvKey);
    let messageObj = JSON.parse(body);
    let messageText:string = "";
    try {
      // tslint:disable-next-line:no-eval
      messageText = eval("'" +  messageObj.message + "'");
    } catch (error) {
      messageText = messageObj.message;
    }
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: deviceToken,
        collapse_key: 'key',
        notification: {
            title: Title,
            body: messageText,
            sound: "default",
            pushtype: PushType,
        },
        data: {  //you can send only notification or only data(or include both)
          title: Title,
          body: body ,
          sound: "default",
          pushtype: PushType,
       }
    };

    fcm.send(message, function(err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
  }

  public static SendFCMMessageV2(serverKey, deviceToken, Title, body, channel,PushType,driverid, orderid) {
    var FCM = require('fcm-node');
    var srvKey = serverKey;
    var fcm = new FCM(srvKey);
    let messageObj = JSON.parse(body);
    let messageText:string = "";
    try {
      // tslint:disable-next-line:no-eval
      messageText = eval("'" +  messageObj.message + "'");
    } catch (error) {
      messageText = messageObj.message;
    }
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: deviceToken,
        collapse_key: 'key',
        notification: {
            title: Title,
            body: messageText,
            sound: "default",
            pushtype: PushType,
            driverid:driverid,
            orderid:orderid, 
        },
        data: {  //you can send only notification or only data(or include both)
          title: Title,
          body: body ,
          sound: "default",
          pushtype: PushType,
          driverid:driverid,
          orderid:orderid, 
       }
    };

    fcm.send(message, function(err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
  }

  public static SendFCMMessageDriverAccepted(serverKey, deviceToken, Title, body, channel,PushType) {
    var FCM = require('fcm-node');
    var srvKey = serverKey;
    var fcm = new FCM(srvKey);
    let messageObj = JSON.parse(body);
    let messageText:string = "";
    try {
      // tslint:disable-next-line:no-eval
      messageText = eval("'" +  messageObj.message + "'");
    } catch (error) {
      messageText = messageObj.message;
    }
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: deviceToken,
        collapse_key: 'key',
        notification: {
            title: Title,
            body: messageText,
            sound: "default",
            pushtype: PushType,
        },
        data: {  //you can send only notification or only data(or include both)
          title: Title,
          body: body ,
          sound: "default",
          pushtype: PushType,
       }
    };

    fcm.send(message, function(err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
  }

  public static SendFCMMessageLiveTracking(serverKey, deviceToken, Title, body, channel, userid,orderid,driverid,pickuplongitude,pickuplatitude,dropoflongitude,dropoflatitude,rating,name,price,pickupLocationTitle,dropofLocationTitle,pushRecieverId,PushType) {
    var FCM = require('fcm-node');
    var srvKey = serverKey;
    var fcm = new FCM(srvKey);    
    let messageText:string = "";
    messageText = body;
    var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
        to: deviceToken,
        collapse_key: 'key',
        notification: {
            title: Title,
            body: messageText,
            sound: "default",
            driverid: parseInt(driverid),
            orderid:parseInt(orderid),
            pickuplongitude:pickuplongitude,
            pickuplatitude:pickuplatitude,
            dropoflongitude:dropoflongitude,
            dropoflatitude:dropoflatitude,
            rating:rating,
            name:name,
            price:price,
            userid:userid,
            pickupLocationTitle:pickupLocationTitle,
            dropofLocationTitle:dropofLocationTitle,
            pushtype:PushType,
         }
         //,
      //   data: {  //you can send only notification or only data(or include both)
      //     title: Title,
      //     body: body ,
      //     sound: "default",
      //     driverid:driverid,
      //     orderid:orderid,
      //  }
    };

    fcm.send(message, function(err, response) {
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
  }
   
}