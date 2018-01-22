
const helper = require('./helper.js');
const _ = require('lodash');

module.exports.firstRun = (event, context, callback) => {

  helper.getData()
    .then(result =>{
      _.forEach(result.Items, location => {
        console.log("location sent to step function -", item.locationId);
        helper.startStateMachine(item);
      });
    })
    .catch(err =>{
      console.log(err);
      callback(err);
    });


  callback(null, "First execution");
};

module.exports.findGeoCode = (event, context, callback) => {

  const location = event;
  const addressText = `${location.line1}, ${location.city}, ${location.zipCode}`;
  location.searchable = false;

  helper.findGeoCode(addressText)
    .then(geocodes => {

      if (geocodes) {
        location._geoloc =  {
          lat: geocodes.lat,
          lng: geocodes.lng
        };
        location.searchable = true;
      }

      callback(null, location);
    })
    .catch(err => {
      callback(err);
    });

};

module.exports.pushToAlgolia = (event, context, callback) => {
  const location = event;
  location.objectID = event.locationId;
  helper.pushToAlgolia(location)
    .then(()=>{
      const message = `${location.locationId} pushed to algolia successfully`;
      helper.sendToSlack(message);
      callback(null, message);
    })
    .catch(err => {
      callback(err)
    });
};

module.exports.locationFailed = (event, context, callback) => {
  const message = `location ${event.locationId} not pushed to Algolia`;
  helper.sendToSlack(message);
  callback(null, message);
};


module.exports.pickSingle = (event, context, callback) => {

  event.Records.forEach(record => {

    if (record.eventName === 'INSERT') {
      const data = record.dynamodb.NewImage;
      const location = {
        locationId: data.locationId.S,
        line1: data.line1.S,
        line2: data.line2.S,
        city: data.city.S,
        state: data.state.S,
        country: data.country.S,
        zipCode: data.zipCode.S
      };
      helper.startStateMachine(location);
    }
    else if (record.eventName === 'REMOVE'){
      const data = record.dynamodb.OldImage;
      const location = {
        locationId: data.locationId.S
      };

      helper.removeFromAlgolia(location.locationId)
        .then(()=>{
          helper.sendToSlack(`${location.locationId} has been removed`);
        })
        .catch(err =>{
          helper.sendToSlack(err);
        });

    }

  });

};


module.exports.findLocations = (event, context, callback) => {
  const address = event.queryParameters.address;

  helper.findGeoCode(address)
    .then(geocodes => {

      if (geocodes) {
        helper.searchAlgolia(geocodes)
          .then(results =>{

            const response = {
              statusCode: 200,
              body: results
            };

            callback(null, response);

          })
          .catch(err => {

            const response = {
              statusCode: 500,
              body: 'Internal Server Error' + err
            };

            callback(null, response);
          });
      }
      else {
        const response = {
          statusCode: 400,
          body: 'Invalid address'
        };

        callback(null, response);
      }


    })

};
