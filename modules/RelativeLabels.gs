//===================================================================
//                     HANDLING RELATIVE LABELS
//===================================================================

var relativeLabels = {

  EVENING_HOURS: 20,

  IN_TWO_HOURS: 'Zero/_In 2 hours',
  NEXT_WEEK:    'Zero/_Next Week',
  THIS_EVENING: 'Zero/_This Evening',
  TOMORROW:     'Zero/_Tomorrow',

  relativeLabelRegexes: {
    inTwoHours:  new RegExp('^Zero(\\/_In 2 hours)'),
    nextWeek:    new RegExp('^Zero(\\/_Next Week)'),
    thisEvening: new RegExp('^Zero(\\/_This Evening)'),
    tomorrow:    new RegExp('^Zero(\\/_Tomorrow)')
  },

  snoozeByTwoHours: function() {
    var label = GmailApp.getUserLabelByName(this.IN_TWO_HOURS);
    var now = new Date();
    var threads = label.getThreads();
    // We should do nothing if relative label has no threads
    if (threads.length == 0) { return; }
    var minutes = Math.round(now.getMinutes()/5)*5;
    now.setMinutes(minutes)
    now.setHours(now.getHours() + 2)
    var labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
    updateLabels(label, labelName, threads)
  },

  snoozeByTomorrow: function() {
    var label = GmailApp.getUserLabelByName(this.TOMORROW);
    var now = new Date();
    var threads = label.getThreads();
    // We should do nothing if relative label has no threads
    if (threads.length == 0) { return; }
    now.setDate(now.getDate() + 1)
    var labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/05:00';
    updateLabels(label, labelName, threads)
  },

  snoozeByThisEvening: function() {
    var label = GmailApp.getUserLabelByName(this.THIS_EVENING);
    var now = new Date();
    var threads = label.getThreads();
    // We should do nothing if relative label has no threads
    if (threads.length == 0) { return; }
    var labelName
    if (now.getHours() < this.EVENING_HOURS) {
      labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/' + ('0' + this.EVENING_HOURS).slice(-2) + ':00';
    } else {
      now.setHours(now.getHours()+1)
      labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/' + ('0' + now.getHours()).slice(-2) + ':00';
    }
    updateLabels(label, labelName, threads)
  },

  snoozeByNextWeek: function() {
    var label = GmailApp.getUserLabelByName(this.NEXT_WEEK);
    var threads = label.getThreads();
    // We should do nothing if relative label has no threads
    if (threads.length == 0) { return; }
    var now = new Date();
    var nextMonday = now.getDate() - now.getDay() + 8;
    now.setDate(nextMonday);
    var labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/05:00';
    updateLabels(label, labelName, threads)
  },

  handleRelativeLabels: function() {
    this.snoozeByTwoHours();
    this.snoozeByNextWeek();
    this.snoozeByThisEvening();
    this.snoozeByTomorrow();
  },

  createRelativeLabels: function() {
    GmailApp.createLabel(this.IN_TWO_HOURS);
    GmailApp.createLabel(this.NEXT_WEEK);
    GmailApp.createLabel(this.THIS_EVENING);
    GmailApp.createLabel(this.TOMORROW);
  },

  isRelativeLabel: function(label) {
    var returnBool = false;
    if (label.getName() == 'Zero') {
      returnBool = true;
    }
    var keys = Object.keys(this.relativeLabelRegexes);
    keys.forEach(function (key){
      if(label.getName().match(this.relativeLabelRegexes[key])) {
        returnBool = true;
      }
    });
    return returnBool;
  }
}
