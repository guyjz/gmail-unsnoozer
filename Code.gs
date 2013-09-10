function doGet() {
    // Install trigger
    ScriptApp.newTrigger('unsnooze')
        .timeBased()
        .everyMinutes(5)
        .create();

    // Show success page
    return HtmlService.createHtmlOutputFromFile('index');
}


function unsnooze() {
    var now = new Date();
    var labels = GmailApp.getUserLabels();

    labels.forEach(function (label) {
        var time = labelTime(label);

        if (!time || time.valueOf() > now.valueOf()) return;

        var threads = label.getThreads();
        if (threads.length) {
            GmailApp.moveThreadsToInbox(threads);
            label.removeFromThreads(threads);
        }
    });

    cleanup();
}


function cleanup() {
    var labels = GmailApp.getUserLabels().filter(function (label) {
        return label.getName().match(/^Zero(\/|$)/);
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
        if (!folders.hasSubs(label) && label.getThreads(0, 1).length === 0) {
            GmailApp.deleteLabel(label);
            folders.remove(label);
        }
    });
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

function labelTime(label) {
    var name = label.getName();
    var match = name.match(/^Zero\/(\d+)\/(\w+)\/(\d+)\/(\d+):(\d+)$/);
    if (!match) return null;

    var year = match[1], monthName = match[2], day = match[3], hour = match[4], minute = match[5];
    var month = monthIndexes[monthName];

    return new Date(year, month, day, hour, minute);
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
