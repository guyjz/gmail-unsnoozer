function doGet() {
  // Creates spreadsheet for logging
  save_log()

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

function createLabelsForNestingLabel(userLabelsNames, labelName) {
  var labelParts = labelName.split('/');
  var testLabel = "";
  for (var labelPartId in labelParts) {
    testLabel += "/" + labelParts[labelPartId]
    if(testLabel[0] === "/"){
      testLabel = testLabel.substring(1);
    }
    Logger.log(testLabel)
    if (userLabelsNames.indexOf(testLabel) == -1){
      GmailApp.createLabel(testLabel);
    }
  }
}

function getName(item) {
  return item.getName()
}

function prepareForRunning(userLabelsNames) {
  if(userLabelsNames.indexOf('Zero') == -1){
    GmailApp.createLabel("Zero");
  }
  createRelativeLabels(userLabelsNames);
}

function save_log() {
  var now = new Date();
  var log_file = SpreadsheetApp.create('Unsnoozer Log ' + now);
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('LOG_FILE', log_file.getId());
}

function sendErrorToAdmin(error) {
  MailApp.sendEmail(Session.getActiveUser().getEmail(), "Unsnoozer error", error);
}

function log(data) {
  var now = new Date();
  var userProperties = PropertiesService.getUserProperties();
  var log_id = userProperties.getProperty('LOG_FILE');
  var log_file;
  try {
    log_file = SpreadsheetApp.openById(log_id);
  } catch(error) {
    sendErrorToAdmin(error);
    Logger.log(error)
    save_log();
    log(data);
    return;
  }
  var sheet = log_file.getSheets()[0];
  if (!(data instanceof Array)) {
    data = [data]
  }
  data = [new Date].concat(data);  // start each log line with the timestamp
  sheet.appendRow(data);
  Logger.log(data);
}

function everyMinute() {
  var userLabels = GmailApp.getUserLabels();
  var userLabelsNames = userLabels.map(getName)
  prepareForRunning(userLabelsNames);
  moveMailToLeafs(userLabelsNames);
  handleRelativeLabels(userLabelsNames);
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

function removeThreadsFromLabel(label, threads) {
  threads.forEach(function (thread){
    log(["Remove thread " + thread.getFirstMessageSubject(), "from label " + label.getName()])
  });
  label.removeFromThreads(threads);
}

function updateLabels(oldLabel, newLabelName, threads, userLabelsNames) {
  log(["updateLabels", "remove from label",  oldLabel.getName()])
  removeThreadsFromLabel(oldLabel, threads);
  log(["updateLabels", "move to", newLabelName])
  var newLabel = GmailApp.getUserLabelByName(newLabelName) || GmailApp.createLabel(newLabelName);
  newLabel.addToThreads(threads);
  createLabelsForNestingLabel(userLabelsNames, newLabelName)
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

function snoozeByTwoHours(userLabelsNames) {
  var label = GmailApp.getUserLabelByName(IN_TWO_HOURS);
  var now = new Date();
  var threads = label.getThreads();
  // We should do nothing if relative label has no threads
  if (threads.length == 0) { return; }
  var minutes = Math.round(now.getMinutes()/5)*5;
  now.setMinutes(minutes)
  now.setHours(now.getHours() + 2)
  var labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ ("0" + now.getDate()).slice(-2) +'/' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
  updateLabels(label, labelName, threads, userLabelsNames)
}

function snoozeByTomorrow(userLabelsNames) {
  var label = GmailApp.getUserLabelByName(TOMORROW);
  var now = new Date();
  var threads = label.getThreads();
  // We should do nothing if relative label has no threads
  if (threads.length == 0) { return; }
  now.setDate(now.getDate() + 1)
  var labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ ("0" + now.getDate()).slice(-2) +'/05:00';
  updateLabels(label, labelName, threads, userLabelsNames)
}

function snoozeByThisEvening(userLabelsNames) {
  var label = GmailApp.getUserLabelByName(THIS_EVENING);
  var now = new Date();
  var threads = label.getThreads();
  // We should do nothing if relative label has no threads
  if (threads.length == 0) { return; }
  var labelName
  if (now.getHours() < EVENING_HOURS) {
    labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ ("0" + now.getDate()).slice(-2) +'/' + ('0' + EVENING_HOURS).slice(-2) + ':00';
  } else {
    now.setHours(now.getHours()+1)
    labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ ("0" + now.getDate()).slice(-2) +'/' + ('0' + now.getHours()).slice(-2) + ':00';
  }
  updateLabels(label, labelName, threads, userLabelsNames)
}

function snoozeByNextWeek(userLabelsNames) {
  var label = GmailApp.getUserLabelByName(NEXT_WEEK);
  var threads = label.getThreads();
  // We should do nothing if relative label has no threads
  if (threads.length == 0) { return; }
  var now = new Date();
  var nextMonday = now.getDate() - now.getDay() + 8;
  now.setDate(nextMonday);
  var labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ ("0" + now.getDate()).slice(-2) +'/05:00';
  updateLabels(label, labelName, threads, userLabelsNames)
}

function handleRelativeLabels(userLabelsNames) {
  snoozeByTwoHours(userLabelsNames);
  snoozeByNextWeek(userLabelsNames);
  snoozeByThisEvening(userLabelsNames);
  snoozeByTomorrow(userLabelsNames);
}

function createRelativeLabels(userLabelsNames) {
  var relativeLabelsArray = [
    IN_TWO_HOURS,
    NEXT_WEEK,
    THIS_EVENING,
    TOMORROW
  ]
  for(var relativeLabelId in relativeLabelsArray){
    if(userLabelsNames.indexOf(relativeLabelsArray[relativeLabelId]) == -1){
      GmailApp.createLabel(relativeLabelsArray[relativeLabelId]);
    }
  }
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

function moveMailFromYearToLeaf(match, threads, label, userLabelsNames) {
  var now = new Date();
  var labelName;
  var year = match[1];
  if (parseInt(year) > parseInt(now.getYear())) {
    labelName = LABEL_PREFIX+ year +'/January/01/05:00';
  } else {
    labelName = tomorrowLabel(now);
  }
  createLabelsForNestingLabel(userLabelsNames, labelName);
  updateLabels(label, labelName, threads, userLabelsNames)
}

function moveMailFromMonthToLeaf(match, threads, label, userLabelsNames) {
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
  updateLabels(label, labelName, threads, userLabelsNames)
}

function moveMailFromDayToLeaf(match, threads, label, userLabelsNames) {
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
    labelName = LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ ("0" + now.getDate()).slice(-2) +'/'+ ('0' + now.getHours()).slice(-2) +':00';
  } else {
    labelName = tomorrowLabel(now);
  }
  updateLabels(label, labelName, threads, userLabelsNames)
}

function tomorrowLabel(now) {
  now.setDate(now.getDate()+1)
  return LABEL_PREFIX+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ ("0" + now.getDate()).slice(-2) +'/05:00';
}

//Move all emails from branch labels to leafs
function moveMailToLeafs(userLabelsNames) {
  var keys = Object.keys(labelRegexes);
  var labels = GmailApp.getUserLabels().filter(function (label) {
        return label.getName().match(/^Zero(\/|$)/);
    });
  labels.forEach(function (label){
    name = label.getName()
    if (!branchLabelIsEmpty(label)) {
      var threads = label.getThreads();
      keys.forEach(function (key){
        var match = name.match(labelRegexes[key])
        if (match) {
          switch (key) {
            case 'year':
              moveMailFromYearToLeaf(match, threads, label, userLabelsNames)
              break;
            case 'month':
              moveMailFromMonthToLeaf(match, threads, label, userLabelsNames)
              break;
            case 'day':
              moveMailFromDayToLeaf(match, threads, label, userLabelsNames)
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


// Goes through labels and checks if they are 'leaf' and overdue
function unsnooze() {
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
          log(["unsnooze", "move threads from labels", label.getName()])
          GmailApp.moveThreadsToInbox(threads);
          removeThreadsFromLabel(label, threads);
        }
      }
    });
  // If any label was overdue - cleanup all labels

  // :TODO probably we should call it every minute
  // so it doesn't depend on existance of overdue labels
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
      return b.getName().slice('/').length - a.getName().slice('/').length;
  })

  labels.forEach(function (label) {
    // NOTE: possible races here:
    //       1. Sublabel could be created during cleanup() invalidating folders structure
    //       2. Thread could be labeled inbetween .getThreads() and .deleteLabel() calls
    if (!folders.hasSubs(label) && labelIsEmpty(label) && !isRelativeLabel(label)) {
      log(["cleanup", "delete label", label.getName()])
      GmailApp.deleteLabel(label);
      folders.remove(label);
    }
  });
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
    return label.getThreads(0, 1).length === 0;
}


// Subfolder accounting mechanism
function Folders(labels) {
    var folders = {};
    var self = {
        add: function (label) {
            var name = label.getName();
            var m = name.match(/^(.+)\/?([^\/]+)?/);
            if (m) {
                folders[m[1]] = folders[m[1]] || [];
                folders[m[1]][name] = true;
            };
        },
        remove: function (label) {
            var name = label.getName();
            var m = name.match(/^(.+)\/?([^\/]+)?/);
            if (m) {
                delete folders[m[1]][name];
                if (Object.keys(folders[m[1]]).length === 0) {
                    delete folders[m[1]];
                }
            }
        },
        hasSubs: function (label) {
          for(var folderName in folders) {
            if ((folderName.indexOf(label.getName()) != -1) && folderName != label.getName()){
              return true;
            }
          }
          return false;
        }
    };

    labels.forEach(self.add);
    return self;
}
