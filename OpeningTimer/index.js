const axios = require('axios');
var message = "";
var priceNow = 0;
var closing = 0;
module.exports = async function (context, myTimer) {

    const getOpeningPrice = await axios.get("https://query2.finance.yahoo.com/v10/finance/quoteSummary/tsla?modules=price").then((response) => {
        priceNow = response.data.quoteSummary.result[0].price.regularMarketPrice.raw.toFixed(2);
        closing = response.data.quoteSummary.result[0].price.regularMarketPreviousClose.raw.toFixed(2);
        message += "\nThe market is now open!\nTSLA previous close price is: $"+closing+".\nTSLA price right now is: $"+priceNow+".\n\nYou can now place your guesses for today using /guessla price (e.g. /guessla 420.69).";
        //context.log("success: "+response.status);
        //context.log("payload: "+JSON.stringify(response.data));
        //context.log("payload: "+response.data.prediction2);
    }, (error) => {
        //context.log("error: "+error.response.status);
        //context.log("error: "+error.response.data);
    });

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