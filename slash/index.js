const axios = require('axios');
const querystring = require('querystring');
const url = 'https://guesslastorage.table.core.windows.net/daily';
const key = process.env.sasToken;
var message = "";
var t = 0;

module.exports = async function (context, req) {

    context.log("Request received. Body:");
    context.log(JSON.stringify(querystring.parse(req.body)));
    const reqJSON = querystring.parse(req.body);
    

    //const prediction = parseFloat(req.body.event.text.replace("<@U01QHV99C2C> ",""));
    const prediction = parseFloat(reqJSON.text);
    context.log(prediction);
    //const id = reqJSON.user_id;
    const id = reqJSON.user_id;
    context.log(id);
    const query = "(PartitionKey='123',RowKey='"+id+"')";
    //const unix_timestamp = req.body.event_time;
    var now = new Date();
    context.log(now);
    var openDate = new Date();
    openDate.setHours(14);
    openDate.setMinutes(30);
    openDate.setSeconds(0);
    openDate.setMilliseconds(0);
    //context.log(openDate);
    var diffMs = (now - openDate);
    var diffMins = Math.round(diffMs / 60000);
    context.log(diffMins);

    if ((diffMins < 0) || (diffMins > 360)) {
        if((diffMins < 390) && (diffMins > 360)) {
            message = "No more bets in the last 30 minutes of trading, <@"+reqJSON.user_id+">.";
            context.log("No more bets in the last 30 minutes of trading.");
        } else {
            message = "Market is closed, <@"+reqJSON.user_id+">.";
            context.log("Market is closed.");
        }
    } else {
        if (diffMins <= 60) {
            t = 6;
        } else if (diffMins <= 120) {
            t = 5;
        } else if (diffMins <= 180) {
            t = 4;
        } else if (diffMins <= 240) {
            t = 3;
        } else if (diffMins <= 300) {
            t = 2;
        } else if (diffMins <= 360) {
            t = 1;
        }
        context.log("T = "+t);
        if(!isNaN(prediction)) {
            //context.log("it's a number")
            const res1 = await axios.get(url+query+key).then((response) => {
                getResponse = response;
                //context.log("success: "+response.status);
                //context.log("payload: "+JSON.stringify(response.data));
                //context.log("payload: "+response.data.prediction2);
            }, (error) => {
                getError = error;
                //context.log("error: "+error.response.status);
                //context.log("error: "+error.response.data);
            });
            //context.log("tipul este: "+typeof getError);
            if(typeof getError != 'undefined'){
                if (getError.response.status == 404) {
                    context.log("Doesn't exist, creating it and adding prediction 1.");
                    const createEntryPrediction1 = await axios.post(url+key, {
                        PartitionKey: "123",
                        RowKey: id,
                        prediction1: prediction,
                        prediction1_t: t
                    }).then((response) => {
                        context.log("Created successfully: "+response.status);
                        message = "1st guess $"+prediction+" T"+t+" received from <@"+reqJSON.user_id+">";
                        //message = "Guess $"+prediction+" T"+t+" received.";
                    }, (error) => {
                        context.log("There was an error: "+error.response.status);
                    });
                }
            } else {
                if (typeof getResponse !== 'undefined') {
                    if (getResponse.status == 200){
                        context.log("Entry already exists");
                        if (typeof getResponse.data.prediction2 == "undefined") {
                            if (getResponse.data.prediction1_t == t) { 
                                message = "User already entered a guess in this trading hour.";
                            } else {
                                context.log("Prediction2 is empty. Adding prediction 2");
                                const createEntryPrediction2 = await axios({
                                    method: 'merge',
                                    url: url+query+key,
                                    data: {
                                        prediction2: prediction,
                                        prediction2_t: t
                                    }
                                }).then((response) => {
                                    context.log("Created successfully: "+response.status);
                                    //message = "2nd guess $"+prediction+" T"+t+" received from <@"+reqJSON.user_id+">";
                                    message = "Guess $"+prediction+" T"+t+" received.";
                                }, (error) => {
                                    context.log("There was an error: "+error.response.status);
                                });
                            }
                        } else if (typeof getResponse.data.prediction3 == "undefined") {
                            if (getResponse.data.prediction2_t == t) { 
                                message = "User already entered a guess in this trading hour.";
                            } else {
                                context.log("Prediction3 is empty. Adding prediction 3");
                                const createEntryPrediction3 = await axios({
                                    method: 'merge',
                                    url: url+query+key,
                                    data: {
                                        prediction3: prediction,
                                        prediction3_t: t
                                    }
                                }).then((response) => {
                                    context.log("Created successfully: "+response.status);
                                    //message = "3rd guess $"+prediction+" T"+t+" received from <@"+reqJSON.user_id+">";
                                    message = "Guess $"+prediction+" T"+t+" received.";
                                }, (error) => {
                                    context.log("There was an error: "+error.response.status);
                                });
                            }
                        } else {
                            context.log("Full")
                            //message = "<@"+reqJSON.user_id+"> already has 3 guesses for the day";
                            message = "User already has 3 guesses for the day";
                        }
                    }
                }
            }
        } else {
            context.log("not a number lol")
            message = reqJSON.text+" is not a valid input. I need a number."
        }
    }
    context.log("channel ID is: "+reqJSON.channel_id);
    const reply = await axios({
        method: 'post',
        url: "https://slack.com/api/chat.postMessage",
        data: {
            "text": message,
            "channel": process.env.slackWorkspaceChannelId
        },
        headers: {
            "Authorization": process.env.slackWorkspaceBearerToken
        }
    }).then((response) => {
        context.log("Message posted successfully, status: "+response.status);
        context.log("Message body: "+JSON.stringify(response.data))
    }, (error) => {
        context.log("There was an error: "+error.response.status);
    });
    if(typeof getError != 'undefined') delete getError;
    if(typeof getResponse != 'undefined') delete getResponse;
    if(typeof id != 'undefined') delete id;
    if(typeof prediction != 'undefined') delete prediction;
    if(typeof query != 'undefined') delete query;
    if(typeof message != 'undefined') delete message;
    context.log("Finish")
}