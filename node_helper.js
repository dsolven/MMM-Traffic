/* Magic Mirror
 * Module: MMM-Traffic
 *
 * By Sam Lewis https://github.com/SamLewis0602
 * MIT Licensed.
 */

var NodeHelper = require('node_helper');
var request = require('request');

module.exports = NodeHelper.create({
  start: function () {
    console.log('MMM-Traffic helper started ...');
  },

  getCommute: function(api_url) {
    var self = this;
    console.log('MMM-Traffic request: ' + api_url + "&departure_time=now")
    request({url: api_url + "&departure_time=now", method: 'GET'}, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var trafficComparison = 0;
        var numRoutes = JSON.parse(body).routes.length;
        console.log('numRoutes: ' + numRoutes)

        var commuteObj = [];

        for(i=0;i<numRoutes;i++) {
          if (JSON.parse(body).routes[i].legs[0].duration_in_traffic) {
            var commute = JSON.parse(body).routes[i].legs[0].duration_in_traffic.text;
            console.log('duration_in_traffic found: ' + commute)
            var noTrafficValue = JSON.parse(body).routes[i].legs[0].duration.value;
            var withTrafficValue = JSON.parse(body).routes[i].legs[0].duration_in_traffic.value;
            var trafficComparison = parseInt(withTrafficValue)/parseInt(noTrafficValue);
          } else {
            var commute = JSON.parse(body).routes[i].legs[0].duration.text;
            console.log('No duration_in_traffic returned.')
            //TODO: Indicate no traffic data.
          }
          var summary = JSON.parse(body).routes[i].summary;

          commuteObj.push({
            commute: commute,
            trafficComparison: trafficComparison,
            summary: summary
          });
        }
        console.log(commuteObj);
        self.sendSocketNotification('TRAFFIC_COMMUTE', {'commuteObj':commuteObj, 'url':api_url});
      } else {
        console.log('MMM-Traffic url request failed:');
        console.log(error);
        console.log(JSON.parse(body).error_message);
        console.log(JSON.parse(body).status);
      }
    });
  },

  getTiming: function(api_url, arrivalTime) {
    var self = this;
    var newTiming = 0;
    request({url: api_url + "&departure_time=now", method: 'GET'}, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var durationValue = JSON.parse(body).routes[0].legs[0].duration.value;
        newTiming = self.timeSub(arrivalTime, durationValue, 0);
	      self.getTimingFinal(api_url, newTiming, arrivalTime);
      }
    });
  },

  getTimingFinal: function(api_url, newTiming, arrivalTime) {
    var self = this;
    request({url: api_url + "&departure_time=" + newTiming, method: 'GET'}, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        var trafficValue = JSON.parse(body).routes[0].legs[0].duration_in_traffic.value;
        var summary = JSON.parse(body).routes[0].summary;
        var finalTime = self.timeSub(arrivalTime, trafficValue, 1);
        self.sendSocketNotification('TRAFFIC_TIMING', {'commute':finalTime,'summary':summary, 'url':api_url});
      }
    });

  },

  timeSub: function(arrivalTime, durationValue, lookPretty) {
    var currentDate = new Date();
    var nowY = currentDate.getFullYear();
    var nowM = (currentDate.getMonth() + 1).toString();
    if (nowM.length == 1) {
      nowM = "0" + nowM;
    }
    var nowD = currentDate.getDate();
    nowD = nowD.toString();
    if (nowD.length == 1) {
      nowD = "0" + nowD;
    }
    var nowH = arrivalTime.substr(0,2);
    var nowMin = arrivalTime.substring(2,4);
    var testDate = new Date(nowY + "-" + nowM + "-" + nowD + " " + nowH + ":" + nowMin + ":00");
    if (lookPretty == 0) {
      if (currentDate >= testDate) {
        var goodDate = new Date (testDate.getTime() + 86400000 - (durationValue*1000)); // Next day minus uncalibrated duration
        return Math.floor(goodDate / 1000);
      } else {
	      var goodDate = new Date (testDate.getTime() - (durationValue*1000)); // Minus uncalibrated duration
        return Math.floor(testDate / 1000);
      }
    } else {
      var finalDate = new Date (testDate.getTime() - (durationValue * 1000));
      var finalHours = finalDate.getHours();
      finalHours = finalHours.toString();
      if (finalHours.length == 1) {
        finalHours = "0" + finalHours;
      }
      var finalMins = finalDate.getMinutes();
      finalMins = finalMins.toString();
      if (finalMins.length == 1) {
        finalMins = "0" + finalMins;
      }
      return finalHours + ":" + finalMins;
    }
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    if (notification === 'TRAFFIC_URL') {
      this.getCommute(payload);
    } else if (notification === 'LEAVE_BY') {
      this.getTiming(payload.url, payload.arrival);
    }
  }

});
