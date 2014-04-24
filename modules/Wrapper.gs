
function tryCatchWrapper(f) {
    try {
        f();
    } catch(error) {
        Logger.log(error)
        sendErrorToAdminMail(error)
    }
}
