
function tryCatchWrapper(f) {
    return function() {
        //try {
            f.apply(this, arguments);
        //} catch(error) {
            sendErrorToAdminMail("error")
        //}
    }
}

sendErrorToAdminMail("sent from wrapper")
