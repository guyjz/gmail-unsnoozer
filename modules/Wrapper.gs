
function tryCatchWrapper(f) {
    return function() {
        try {
            Logger.log("Wrapped!")
            f.apply(this, arguments);
        } catch(error) {
            sendErrorToAdminMail(error)
        }
    }
}
