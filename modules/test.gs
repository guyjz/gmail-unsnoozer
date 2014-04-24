function bazz() {
    Logger.log('Bazz!')
}

var fooNamespace = {
    bar: function() {
        Logger.log('Bar!')
    }

    funcWithIntendedError: function() {
        intendedError();
    }
}
