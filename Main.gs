function doGet() {
  // Creates spreadsheet for logging
  save_log()

  // Create labels necessary for "handleRelativeLabels" script
  GmailApp.createLabel("Zero");
  createRelativeLabels();

  // Remove previous triggers if we reinstall app
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

 function everyMinute() {
   moveMailToLeafs();
   relativeLabels.handleRelativeLabels();
   unsnooze();
 }

function save_log() {
  var now = new Date();
  var log_file = SpreadsheetApp.create('Unsnoozer Log ' + now);
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('LOG_FILE', log_file.getId());
}

function log(data) {
  var now = new Date();
  var userProperties = PropertiesService.getuserProperties();
  var log_id = userProperties.getProperty('LOG_FILE');
  var log = SpreadsheetApp.openById(log_id);
  var sheet = log.getSheets()[0];
  if (!(data instanceof Array)) {
    data = [data]
  }
  data.push(new Date)
  sheet.appendRow(data);
  Logger.log(data);
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
  log(["updateLabels", "remove from label", oldLabel.getName()])
  oldLabel.removeFromThreads(threads);
  log(["updateLabels", "move to", newLabelName])
  var newLabel = GmailApp.getUserLabelByName(newLabelName) || GmailApp.createLabel(newLabelName);
  newLabel.addToThreads(threads);
}

var LABEL_PREFIX = 'Zero/';

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
          label.removeFromThreads(threads);
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