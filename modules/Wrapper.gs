
function tryCatchWrapper(f) {
    return function() {
        try {
            f.apply(this, arguments);
        } catch(error) {
            Logger.log(error)
            sendErrorToAdminMail(error)
        }
    }
}
