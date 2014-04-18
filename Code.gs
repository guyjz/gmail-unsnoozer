function doGet() {
  // Creates spreadsheet for logging
  save_log()

  // Create labels necessary for "handleRelativeLabels" script
  GmailApp.createLabel("Zero");
  createRelativeLabels();

  // Remove previous trigger if we reinstall app
  var triggers = ScriptApp.getProjectTriggers();
  for(var i in triggers) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  // Install trigger
  ScriptApp.newTrigger('everyMinute')
    .timeBased()
    .everyMinutes(1)
    .create();

  // Show success page
  return HtmlService.createHtmlOutputFromFile('index');
}

function save_log() {
  var now = new Date();
  var log_file = SpreadsheetApp.create('Unsnoozer Log ' + now);
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('LOG_FILE', log_file.getId());
}

function log(data) {
  var now = new Date();
  var scriptProperties = PropertiesService.getScriptProperties();
  var log_id = scriptProperties.getProperty('LOG_FILE');
  var log = SpreadsheetApp.openById(log_id);
  var sheet = log.getSheets()[0];
  if (!(data instanceof Array)) {
    data = [data]
  }
  sheet.appendRow(data);
  Logger.log(data);
}

function everyMinute() {
  moveMailToLeafs();
  handleRelativeLabels();
  unsnooze();
}

// Extracts time from label name
var monthIndexes = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11
}

var monthNames = Object.keys(monthIndexes);

function updateLabels(oldLabel, newLabelName, threads) {
  log(["updateLabels: remove old label ", oldLabel.getName()])
  oldLabel.removeFromThreads(threads);
  log(["updateLabels: remove old label " ,oldLabel.getName()])
  var newLabel = GmailApp.getUserLabelByName(newLabelName) || GmailApp.createLabel(newLabelName);
  newLabel.addToThreads(threads);
}

var LABEL_PREFIX = 'Zero/';

var relativeLabelRegexes = {
  inTwoHours:  new RegExp('^Zero(\\/_In 2 hours)'),
  nextWeek:    new RegExp('^Zero(\\/_Next Week)'),
  thisEvening: new RegExp('^Zero(\\/_This Evening)'),
  tomorrow:    new RegExp('^Zero(\\/_Tomorrow)')
}

//===================================================================
//                     HANDLING RELATIVE LABELS
//===================================================================

var EVENING_HOURS = 20;

var IN_TWO_HOURS = 'Zero/_In 2 hours'
var NEXT_WEEK = 'Zero/_Next Week'
var THIS_EVENING = 'Zero/_This Evening'
var TOMORROW = 'Zero/_Tomorrow'

function snoozeByTwoHours() {
  var label = GmailApp.getUserLabelByName(IN_TWO_HOURS);
  var now = new Date();
  var threads = label.getThreads();
  // We should do nothing if relative label has no threads
  if (threads.length == 0) { return; }
  var minutes = Math.round(now.getMinutes()/5)*5;
  now.setMinutes(minutes)
  now.setHours(now.getHours() + 2)
  var labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
  updateLabels(label, labelName, threads)
  Logger.log(labelName, 0)
}

function snoozeByTomorrow() {
  var label = GmailApp.getUserLabelByName(TOMORROW);
  var now = new Date();
  var threads = label.getThreads();
  // We should do nothing if relative label has no threads
  if (threads.length == 0) { return; }
  now.setDate(now.getDate() + 1)
  var labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/05:00';
  updateLabels(label, labelName, threads)
  Logger.log(labelName, 0)
}

function snoozeByThisEvening() {
  var label = GmailApp.getUserLabelByName(THIS_EVENING);
  var now = new Date();
  var threads = label.getThreads();
  // We should do nothing if relative label has no threads
  if (threads.length == 0) { return; }
  var labelName
  if (now.getHours() < EVENING_HOURS) {
    labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/' + ('0' + EVENING_HOURS).slice(-2) + ':00';
  } else {
    now.setHours(now.getHours()+1)
    labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/' + ('0' + now.getHours()).slice(-2) + ':00';
  }
  updateLabels(label, labelName, threads)
  Logger.log(labelName, 0)
}

function snoozeByNextWeek() {
  var label = GmailApp.getUserLabelByName(NEXT_WEEK);
  var threads = label.getThreads();
  // We should do nothing if relative label has no threads
  if (threads.length == 0) { return; }
  var now = new Date();
  var nextMonday = now.getDate() - now.getDay() + 8;
  now.setDate(nextMonday);
  var labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/05:00';
  updateLabels(label, labelName, threads)
  Logger.log(labelName, 0)
}

function handleRelativeLabels() {
  snoozeByTwoHours();
  snoozeByNextWeek();
  snoozeByThisEvening();
  snoozeByTomorrow();
}

function createRelativeLabels() {
  GmailApp.createLabel(IN_TWO_HOURS);
  GmailApp.createLabel(NEXT_WEEK);
  GmailApp.createLabel(THIS_EVENING);
  GmailApp.createLabel(TOMORROW);
}

//===================================================================
//                     MOVING MAIL TO LEAFS
//===================================================================

//Label regexes for branch labels matching
var labelRegexes = {
  year:  new RegExp('^Zero\\/(\\d+)$'),
  month: new RegExp('^Zero\\/(\\d+)\\/(\\w+)$'),
  day:   new RegExp('^Zero\\/(\\d+)\\/(\\w+)\\/(\\d+)$')
}

function branchLabelIsEmpty(label) {
  // Non-leaf labels (with no time) should be empty
  return !labelTime(label) && label.getThreads(0, 1).length === 0;
}

function moveMailFromYearToLeaf(match, threads, label) {
  var now = new Date();
  var labelName;
  var year = match[1];
  Logger.log('Year = %s', year)
  if (parseInt(year) > parseInt(now.getYear())) {
    labelName = LABEL_PREFIX+ year +'/January/01/05:00';
  } else {
    labelName = tomorrowLabel(now);
  }
  updateLabels(label, labelName, threads)
}

function moveMailFromMonthToLeaf(match, threads, label) {
  var now = new Date();
  var labelName;
  var year  = match[1];
  var month = match[2];
  var isNextYear  = parseInt(year) > parseInt(now.getYear());
  var isNextMonth = monthIndexes[month] > parseInt(now.getMonth());
  if (isNextYear || isNextMonth) {
    labelName = LABEL_PREFIX+ year +'/' + month + '/01/05:00';
  } else {
    labelName = tomorrowLabel(now);
  }
  updateLabels(label, labelName, threads)
}

function moveMailFromDayToLeaf(match, threads, label) {
  var now = new Date();
  var labelName;
  var year  = match[1];
  var month = match[2];
  var day   = match[3];
  var isNextYear   = parseInt(year) > parseInt(now.getYear());
  var isNextMonth  = monthIndexes[month] > parseInt(now.getMonth());
  var isNextDay    = parseInt(day) > parseInt(now.getDate());
  var isCurrentDay = parseInt(day) == parseInt(now.getDate());
  if (isNextYear || isNextMonth || isNextDay) {
    labelName = LABEL_PREFIX+ year +'/' + month + '/'+ day +'/05:00';
  } else if (isCurrentDay) {
    now.setHours(now.getHours()+1)
    labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/'+ ('0' + now.getHours()).slice(-2) +':00';
  } else {
    labelName = tomorrowLabel(now);
  }
  Logger.log(labelName, 0)
  updateLabels(label, labelName, threads)
}

function tomorrowLabel(now) {
  now.setDate(now.getDate()+1)
  return LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/05:00';
}

//Move all emails from branch labels to leafs
function moveMailToLeafs() {
  var keys = Object.keys(labelRegexes);
  var labels = GmailApp.getUserLabels().filter(function (label) {
        return label.getName().match(/^Zero(\/|$)/);
    });
  labels.forEach(function (label){
    name = label.getName()
    Logger.log(name, 0)
    if (!branchLabelIsEmpty(label)) {
      var threads = label.getThreads();
      keys.forEach(function (key){
        var match = name.match(labelRegexes[key])
        if (match) {
          switch (key) {
            case 'year':
              label.removeFromThreads(threads);
              moveMailFromYearToLeaf(match, threads, label)
              break;
            case 'month':
              moveMailFromMonthToLeaf(match, threads, label)
              break;
            case 'day':
              moveMailFromDayToLeaf(match, threads, label)
              break;
          }
        }
    });
    }
  });
}

//===================================================================
//                           UNSNOOZER
//===================================================================

function unsnooze() {
  log('Unsnooze')
    var now = new Date();
    var labels = GmailApp.getUserLabels();
    var changed = false;

    labels.forEach(function (label) {
      var time = labelTime(label);
      // If it's leaf label and it's overdue
      // move all threads from it to inbox
      if (time && time.valueOf() < now.valueOf()){
        changed = true;
        var threads = label.getThreads();
        if (threads.length) {
          log(['unsnooze: move threads from', label.getName()])
          GmailApp.moveThreadsToInbox(threads);
          label.removeFromThreads(threads);
        }
      }
    });
  // If any label was overdue - cleanup all labels
  if (changed) cleanup();
}

// Remove empty labels
function cleanup() {
  var labels = GmailApp.getUserLabels().filter(function (label) {
    return label.getName().match(/^Zero\/(\d+)(\/|$)/);
  });
  var folders = Folders(labels);

  // Sort labels by name length descending to process leaves earlier
  labels.sort(function (a, b) {
      return b.getName().splice('/').length - a.getName().splice('/').length;
  })

    //labels.forEach(function (label) {
    //  Logger.log('Cleanup',0)
      // NOTE: possible races here:
      //       1. Sublabel could be created during cleanup() invalidating folders structure
      //       2. Thread could be labeled inbetween .getThreads() and .deleteLabel() calls

    //  if (!folders.hasSubs(label) && labelIsEmpty(label) && !isRelativeLabel(label)) {
    //      log("    REMOVE LABEL " + label.getName())
    //      GmailApp.deleteLabel(label);
    //      folders.remove(label);
    //  }
    //});
}

function isRelativeLabel(label) {
  var returnBool = false;
  if (label.getName() == 'Zero') {
    returnBool = true;
  }
  var keys = Object.keys(relativeLabelRegexes);
  keys.forEach(function (key){
    if(label.getName().match(relativeLabelRegexes[key])) {
      returnBool = true;
    }
  });
  return returnBool;
}

function labelTime(label) {
    var name = label.getName();
    var match = name.match(/^Zero\/(\d+)\/(\w+)\/(\d+)\/(\d+):(\d+)$/);
    if (!match) return null;

    var year = match[1], monthName = match[2], day = match[3], hour = match[4], minute = match[5];
    var month = monthIndexes[monthName];

    return new Date(year, month, day, hour, minute);
}

function labelIsEmpty(label) {
    // Non-leaf labels (with no time) should be empty
    return !labelTime(label) || label.getThreads(0, 1).length === 0;
}


// Subfolder accounting mechanism
function Folders(labels) {
    var folders = {};
    var self = {
        add: function (label) {
            var name = label.getName();
            var m = name.match(/^(.+)\/([^\/]+)/);
            if (m) {
                folders[m[1]] = folders[m[1]] || [];
                folders[m[1]][name] = true;
            };
        },
        remove: function (label) {
            var name = label.getName();
            var m = name.match(/^(.+)\/([^\/]+)/);
            if (m) {
                delete folders[m[1]][name];
                if (Object.keys(folders[m[1]]).length === 0) {
                    delete folders[m[1]];
                }
            }
        },
        hasSubs: function (label) {
            return label.getName() in folders;
        }
    };

    labels.forEach(self.add);
    return self;
}
