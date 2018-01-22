const AWS = require('aws-sdk');
const _ = require('lodash');

const docClient = new AWS.DynamoDB.DocumentClient();
const googleApiClient = require('@google/maps').createClient({key: 'AIzaSyDWiCbOhFft4YaaXaObWqjsg6cE4JGCqgw'});

const algoliasearch = require('algoliasearch');
const algoliaClient = algoliasearch('O78GRIMGQH', 'fb26e767ce773b42b84589d15210bd6a');
const algoliaIndex = algoliaClient.initIndex('locations');

const SlackWebhook = require('slack-webhook');
const slack = new SlackWebhook('https://hooks.slack.com/services/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');

exports.getData = () =>{
  const params ={
    TableName: 'location-list'
  };

  return new Promise((resolve, reject) =>{

    docClient.scan(params,(err,data) => {
        if (err){
          reject(err);
          console.error(err);
        }
        else
        {
          //console.log(data);
          resolve(data);
        }
    });
  });
};

exports.findGeoCode = addressText =>{

  addressText = "317 BROADWAY, New York, NY, US, 10007";

  return new Promise((resolve, reject) =>{

      googleApiClient.geocode({
        address: addressText
      }, (err, response) =>{
        if(err){
          reject(err);
          console.log(err);
        }
        else{
          const geometry = response.json.results[0].geometry;
          resolve(geometry.location);
          //console.log(geometry.location);
        }
      });
  });

};

exports.startStateMachine = location => {

  console.log('in startStateMachine ' + location.locationId);
  const params = {
    stateMachineArn: "arn:aws:states:us-east-2:631072867253:stateMachine:atm-finder-v3",
    input: JSON.stringify(location)
  };

  const stepfunctions = new AWS.StepFunctions();
  stepfunctions.startExecution(params, function(err, data) {

    if (err) {
      console.log("There was a error");
      console.error(err);
    }
    else  {
      console.log('StateMachine start was successfull for ');
      console.log(data);
    }
  });

};

exports.pushToAlgolia = location => {
  return algoliaIndex.addObject(location);
};

exports.sendToSlack = message => {
  slack.send(message)
    .then(data => {
      console.log(data);
    })
    .catch(err => {
      console.log(err);
    });
};


exports.removeFromAlgolia = locationId => {
  return algoliaIndex.deleteObject(locationId);
};

exports.findLocationsByGeoCodes = geocodes => {

  return algoliaLocationsIndex.search({
    aroundLatLng: `${geocodes.lat}, ${geocodes.lng}`,
    aroundRadius: 10000  //roughly 6 miles
  });

};
