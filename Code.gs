function doGet() {
  // Install trigger
  ScriptApp.newTrigger('unsnooze')
      .timeBased()
      .everyMinutes(1)
      .create();

  ScriptApp.newTrigger('moveMailToLeafs')
      .timeBased()
      .everyMinutes(1)
      .create();

  ScriptApp.newTrigger('handleRelativeLabels')
      .timeBased()
      .everyMinutes(1)
      .create();

  // Show success page
  return HtmlService.createHtmlOutputFromFile('index');
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
  oldLabel.removeFromThreads(threads);
  var newLabel = GmailApp.getUserLabelByName(newLabelName) || GmailApp.createLabel(newLabelName);
  newLabel.addToThreads(threads);
}

//===================================================================
//                     HANDLING RELATIVE LABELS
//===================================================================

var relativeLabelRegexes = {
  inTwoHours:  new RegExp('^(testing)(\\/_In 2 hours)'),
  nextWeek:    new RegExp('^(testing)(\\/_Next Week)'),
  thisEvening: new RegExp('^(testing)(\\/_This Evening)'),
  tomorrow:    new RegExp('^(testing)(\\/_Tomorrow)')
}

function snoozeByTwoHours(label) {
  Logger.log('snoozeByTwoHours', 0)
  var now = new Date();
  var threads = label.getThreads();
  var minutes = Math.round(now.getMinutes()/5)*5;
  now.setMinutes(minutes)
  now.setHours(now.getHours() + 2)
  var labelName = 'testing/'+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/' + now.getHours() + ':' + now.getMinutes();
  updateLabels(label, labelName, threads)
  Logger.log(labelName, 0)
}

function snoozeByTomorrow(label) {
  Logger.log('snoozeByTomorrow', 0)
  var now = new Date();
  var threads = label.getThreads();
  now.setDate(now.getDate() + 1)
  var labelName = 'testing/'+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/05:00';
  updateLabels(label, labelName, threads)
  Logger.log(labelName, 0)
}

function snoozeByThisEvening(label) {
  Logger.log('snoozeByThisEvening', 0)
}

function snoozeByNextWeek(label) {
  Logger.log('snoozeByNextWeek', 0)
}

function handleRelativeLabels() {
  var keys = Object.keys(relativeLabelRegexes);
  var labels = GmailApp.getUserLabels().filter(function (label) {
        return label.getName().match(/^(testing)(\/|$)/);
    });
  labels.forEach(function (label){
    name = label.getName()
    keys.forEach(function (key){
      var match = name.match(relativeLabelRegexes[key])
      if (match && label.getThreads(0, 1).length > 0) {
        switch (key) {
          case 'inTwoHours':
            snoozeByTwoHours(label);
            break;
          case 'nextWeek':
            snoozeByNextWeek(label);
            break;
          case 'thisEvening':
            snoozeByThisEvening(label);
            break;
          case 'tomorrow':
            snoozeByTomorrow(label);
            break;
        }
       }
    });
  });

}

//===================================================================
//                     MOVING MAIL TO LEAFS
//===================================================================

//Label regexes for branch labels matching
var labelRegexes = {
  year:  new RegExp('^(?:testing\\/)(\\d+)$'),
  month: new RegExp('^(?:testing\\/)(\\d+)\\/(\\w+)$'),
  day:   new RegExp('^(?:testing\\/)(\\d+)\\/(\\w+)\\/(\\d+)$')
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
    labelName = 'testing/'+ year +'/January/01/05:00';
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
    labelName = 'testing/'+ year +'/' + month + '/01/05:00';
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
    labelName = 'testing/'+ year +'/' + month + '/'+ day +'/05:00';
  } else if (isCurrentDay) {
    now.setHours(now.getHours()+1)
    labelName = 'testing/'+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/'+ now.getHours() +':00';
  } else {
    labelName = tomorrowLabel(now);
  }
  updateLabels(label, labelName, threads)
}

function tomorrowLabel(now) {
  now.setDate(now.getDate()+1)
  return 'testing/'+ now.getYear() +'/' + monthNames[now.getMonth()] + '/'+ now.getDate() +'/05:00';
}

//Move all emails from branch labels to leafs
function moveMailToLeafs() {
  GmailApp.createLabel('test');
  var keys = Object.keys(labelRegexes);
  var labels = GmailApp.getUserLabels().filter(function (label) {
        return label.getName().match(/^(testing)(\/|$)/);
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

function unsnooze() {
    var now = new Date();
    var labels = GmailApp.getUserLabels();
    var changed = false;

    labels.forEach(function (label) {
        var time = labelTime(label);

        if (!time || time.valueOf() > now.valueOf()) return;
        changed = true;

        var threads = label.getThreads();
        if (threads.length) {
            GmailApp.moveThreadsToInbox(threads);
            label.removeFromThreads(threads);
        }
    });

    if (changed) cleanup();
}


function cleanup() {
    var labels = GmailApp.getUserLabels().filter(function (label) {
        return label.getName().match(/^(\[Gmail\]\/)?Zero(\/|$)/);
    });
    var folders = Folders(labels);

    // Sort labels by name length descending to process leaves earlier
    labels.sort(function (a, b) {
        return b.getName().length - a.getName().length;
    })

    labels.forEach(function (label) {
        // NOTE: possible races here:
        //       1. Sublabel could be created during cleanup() invalidating folders structure
        //       2. Thread could be labeled inbetween .getThreads() and .deleteLabel() calls
        if (!folders.hasSubs(label) && labelIsEmpty(label)) {
            GmailApp.deleteLabel(label);
            folders.remove(label);
        }
    });
}

function labelTime(label) {
    var name = label.getName();
    var match = name.match(/^(?:\[Gmail\]\/)?Zero\/(\d+)\/(\w+)\/(\d+)\/(\d+):(\d+)$/);
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
