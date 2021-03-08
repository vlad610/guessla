const axios = require('axios');
const url = "https://"+process.env.storageAccount+".table.core.windows.net/daily";
const key = process.env.sasToken;
var message = "";
var price = 0;
module.exports = async function (context, myTimer) {

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

    const getPrice = await axios.get("https://query2.finance.yahoo.com/v10/finance/quoteSummary/tsla?modules=price").then((response) => {
        price = response.data.quoteSummary.result[0].price.regularMarketPrice.raw.toFixed(2);
        message = "\nTSLA price is: $"+price+"\n";
        //context.log("success: "+response.status);
        //context.log("payload: "+JSON.stringify(response.data));
        //context.log("payload: "+response.data.prediction2);
    }, (error) => {
        //context.log("error: "+error.response.status);
        //context.log("error: "+error.response.data);
    });

    message += "Today's guesses:\n"
    context.log(JSON.stringify(getResponse.data.value));
    getResponse.data.value.forEach(myFunction);

    function myFunction(item){
        //message += "<@"+item.RowKey+"> - $"+item.prediction1+" T"+item.prediction1_t;
        message += "Anonymous - $"+item.prediction1+" T"+item.prediction1_t;
        if (typeof item.prediction2 != "undefined") {
            message += ", $"+item.prediction2+" T"+item.prediction2_t;
        }
        if (typeof item.prediction3 != "undefined") {
            message += ", $"+item.prediction3+" T"+item.prediction3_t;
        }
        message += "\n";
    }

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
    if(typeof message != 'undefined') delete message;
};