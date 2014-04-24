
function tryCatchWrapper(f) {
    return function() {
        try {
            f();
        } catch(error) {
            Logger.log(error)
            sendErrorToAdminMail(error)
        }
    }
}
