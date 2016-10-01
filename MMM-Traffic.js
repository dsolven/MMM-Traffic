/* global Module */

/* Magic Mirror
 * Module: MMM-Traffic
 *
 * By Sam Lewis https://github.com/SamLewis0602
 * MIT Licensed.
 */

Module.register('MMM-Traffic', {

    defaults: {
        api_key: '',
        mode: 'driving',
        interval: 300000, //all modules use milliseconds
        origin: '',
        destination: '',
        alternatives: false,
        traffic_model: 'best_guess',
        departure_time: 'now',
        arrival_time: '',
        loadingText: 'Loading commute...',
        prependText: 'Current commute is',
        changeColor: false,
        limitYellow: 10,
        limitRed: 30,
        showGreen: true,
        language: config.language,
        show_summary: true
    },

    start: function() {
        Log.info('Starting module: ' + this.name);
        if (this.data.classes === 'MMM-Traffic') {
          this.data.classes = 'bright medium';
        }
        this.loaded = false;
        this.leaveBy = '';
        this.url = encodeURI('https://maps.googleapis.com/maps/api/directions/json' + this.getParams());
        this.symbols = {
            'driving': 'fa fa-car',
            'walking': 'fa fa-odnoklassniki',
            'bicycling': 'fa fa-bicycle',
            'transit': 'fa fa-train'
        };
        this.commute = '';
        this.summary = '';
        this.updateCommute(this);
    },

    updateCommute: function(self) {
        Log.log(self.name + ' sending a socket notification');
        if (self.config.arrival_time.length == 4) {
          self.sendSocketNotification('LEAVE_BY', {'url':self.url, 'arrival':self.config.arrival_time});
        } else {
          self.sendSocketNotification('TRAFFIC_URL', self.url);
        }
        setTimeout(self.updateCommute, self.config.interval, self);
    },

    getStyles: function() {
        return ['traffic.css', 'font-awesome.css'];
    },

    getDom: function() {
        var wrapper = document.createElement("div");

        if (!this.loaded) {
            wrapper.innerHTML = this.config.loadingText;
            return wrapper;
        }

        // Title block
        var commuteTitle = document.createElement('div');
        // Symbol
        var symbol = document.createElement('span');
        symbol.className = this.symbols[this.config.mode] + ' symbol';
        commuteTitle.appendChild(symbol);
        // Route name
        var routeName = document.createElement('span');
        routeName.innerHTML = this.config.route_name;
        commuteTitle.appendChild(routeName);

        wrapper.appendChild(commuteTitle);


        // Route info
        for (i=0;i<this.commuteObj.length;i++){
          var curCommute = this.commuteObj[i];
          var commuteInfo = document.createElement('div');
          sumSpan = document.createElement('span');
          timeSpan = document.createElement('span');

          commuteInfo.className = 'small thin light bright';

          sumSpan.innerHTML = curCommute.summary + ': ';
          timeSpan.innerHTML = curCommute.commute;

          //change color if desired and append
          if (this.config.changeColor) {
            if (this.trafficComparison >= 1 + (this.config.limitRed / 100)) {
              timeSpan.className += ' red';
            } else if (this.trafficComparison >= 1 + (this.config.limitYellow / 100)) {
              timeSpan.className += ' yellow';
            } else if (this.config.showGreen) {
              timeSpan.className += ' green';
            }
          }


          commuteInfo.appendChild(sumSpan);
          commuteInfo.appendChild(timeSpan);
          wrapper.appendChild(commuteInfo);
        }

        return wrapper;
    },

    getParams: function() {
        var params = '?';
        params += 'mode=' + this.config.mode;
        params += '&origin=' + this.config.origin;
        params += '&destination=' + this.config.destination;
        params += '&key=' + this.config.api_key;
        params += '&traffic_model=' + this.config.traffic_model;
        params += '&language=' + this.config.language;
        params += '&alternatives=' + this.config.alternatives;
        return params;
    },

    socketNotificationReceived: function(notification, payload) {
        Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
        this.leaveBy = '';
        if (notification === 'TRAFFIC_COMMUTE' && payload.url === this.url) {
            this.commuteObj = payload.commuteObj;
            this.loaded = true;
            this.updateDom(1000);
        } else if (notification === 'TRAFFIC_TIMING') {
            this.leaveBy = payload.commute;
            this.summary = payload.summary;
            this.loaded = true;
            this.updateDom(1000);
        }
    }

});
