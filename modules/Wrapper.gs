function tryCatchWrapper(f) {
    Logger.log("Try Catch Wrapper")
    try {
        f();
    } catch(error) {
        Logger.log(error)
        sendErrorToAdminMail(error)
    }
}
