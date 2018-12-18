'use strict';

// Imports dependencies and set up http server
const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json()); // creates express http server
const request = require('request');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const sendAPIUrl = process.env.SEND_API_URL;
const serverAPIUrl = process.env.SERVER_API_URL;

if (PAGE_ACCESS_TOKEN === undefined) {
  throw new Error('Cannot find environment variable PAGE_ACCESS_TOKEN with Facebook Page access token');
}
if (sendAPIUrl === undefined) {
  throw new Error('Cannot find environment variable SEND_API_URL with Facebook send api url');
}
if (serverAPIUrl === undefined) {
  throw new Error(`Cannot find environment variable SERVER_API_URL with url of cirichat-server`)
}
// Sets server port and logs message on success
app.listen(process.env.PORT || 8080, () => console.log('app is listening'));

// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {
  
  let body = req.body;
  
  // Checks this is an event from a page subscription
	if (body.object === 'page') {
    
    // Iterates over each entry - there may be multiple if batched
		body.entry.forEach(function(entry) {
      
      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: ' + sender_psid);
      
      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);        
      }
      
    });
    
    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
	} else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {
  
  // Your verify token. Should be a random string.
  const VERIFY_TOKEN = "YOUR_VERIFY_STRING";

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
  
  // Checks if a token and mode is in the query string of the requests
  if (mode && token) {
    
    // Check the mode and token sent is correct
    if (mode === 'subscribe' && token == VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
      
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});
  
// Handles messages events
function handleMessage(sender_psid, received_message) {

  // Check if the message contains text
  if (received_message.text) {    
    // If it does than we call cirichat-server and get response to that message
    let message = received_message.text;
    request({
      "uri": serverAPIUrl,
      "method": "POST",
      "json": { message: message }
    }, (err, res, body) => {
      if (!err) {
        let resp = body.response;
        console.log(`Message '${message}' received response '${resp}'`)
        
        // Create the payload for a basic text message
        let response = {
          "text": resp
        };

        // Sends the response message
        callSendAPI(sender_psid, response);

      } else {
        console.log(`Error: could not receive response to message '${message}'`)
      }
    });

  }  
  
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }
  
  // Send the HTTP request to the Messenger Platform
  request({
    "uri": sendAPIUrl,
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}
  
  
  
  
  
  
  
  
  