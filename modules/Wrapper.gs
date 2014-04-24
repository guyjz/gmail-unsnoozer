MailApp.sendEmail("maksim@mindojo.com", "Error occured in Unsnoozer", error);

function tryCatchWrapper(f) {
    return function() {
        //try {
            f.apply(this, arguments);
        //} catch(error) {
            sendErrorToAdminMail("error")
        //}
    }
}

function sendErrorToAdminMail(error) {
    MailApp.sendEmail("maksim@mindojo.com", "Error occured in Unsnoozer", error);
}
