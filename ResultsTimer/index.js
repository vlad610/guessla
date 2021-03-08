const axios = require('axios');
const url = "https://"+process.env.storageAccount+".table.core.windows.net/daily";
const key = process.env.sasToken;
var message = "";
var winner = "";
var iv = 88.2 * 0.014;
var individual_max = 0;
var overall_max = 0;
var closing = 0;
var temp_max = 0;
var above_1 = [];
module.exports = async function (context, myTimer) {

    const getClosingPrice = await axios.get("https://query2.finance.yahoo.com/v10/finance/quoteSummary/tsla?modules=price").then((response) => {
        closing = response.data.quoteSummary.result[0].price.regularMarketPrice.raw.toFixed(2);
        message += "\nTSLA closing price is: $"+closing+"\n\n";
        //context.log("success: "+response.status);
        //context.log("payload: "+JSON.stringify(response.data));
        //context.log("payload: "+response.data.prediction2);
    }, (error) => {
        //context.log("error: "+error.response.status);
        //context.log("error: "+error.response.data);
    });

    const res1 = await axios.get(url+key).then((response) => {
        getResponse = response;
        //context.log("success: "+response.status);
        //context.log("payload: "+JSON.stringify(response.data));
        //context.log("payload: "+response.data.prediction2);
    }, (error) => {
        getError = error;
        //context.log("error: "+error.response.status);
        //context.log("error: "+error.response.data);
    });

    message += "Today's results:\n"
    context.log(JSON.stringify(getResponse.data.value));
    getResponse.data.value.forEach(myFunction);

    function myFunction(item){
        individual_max = 0;
        temp_max = 0;
        message += "<@"+item.RowKey+"> - $"+item.prediction1+" T"+item.prediction1_t;
        temp_max = ((iv * item.prediction1_t) / Math.abs(closing - item.prediction1)).toFixed(2);
        if (temp_max > individual_max) {
            individual_max = temp_max;
        }
        message += " "+temp_max;

        if (typeof item.prediction2 != "undefined") {
            message += ", $"+item.prediction2+" T"+item.prediction2_t;
            temp_max = ((iv * item.prediction2_t) / Math.abs(closing - item.prediction2)).toFixed(2);
            if (temp_max > individual_max) {
                individual_max = temp_max;
            }
            message += " "+temp_max;
        }
        if (typeof item.prediction3 != "undefined") {
            message += ", $"+item.prediction3+" T"+item.prediction3_t;
            temp_max = ((iv * item.prediction3_t) / Math.abs(closing - item.prediction3)).toFixed(2);
            if (temp_max > individual_max) {
                individual_max = temp_max;
            }
            message += " "+temp_max;
        }
        if (individual_max > 1) {
            context.log("Row key above 1: "+item.RowKey+" and individual_max: "+individual_max);
            above_1.push(item.RowKey);
        }
        message += " - best result is "+individual_max;
        message += "\n";
        if (individual_max > overall_max) {
            overall_max = individual_max;
            winner = item.RowKey;
        }
    }
    message += "\n";
    above_1.forEach(myFunction2);

    function myFunction2(item) {
        message += "<@"+item+"> ";
    }
    
    message += "scored 1 or higher!\n"
    message += "\nToday's winner is: <@"+winner+">, with "+overall_max+"!";

    const reply = await axios({
        method: 'post',
        url: "https://slack.com/api/chat.postMessage",
        data: {
            "text": message,
            "channel": process.env.slackWorkspaceChannelId
            //"channel": "U01DK7N9PTQ"
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
    if(typeof message != 'undefined') delete message;
};