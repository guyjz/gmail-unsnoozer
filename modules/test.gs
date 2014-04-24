function bazz() {
    Logger.log('Bazz!')
}

function funcWithIntendedError() {
    intendedError();
}

var fooNamespace = {
    bar: function() {
        Logger.log('Bar!')
    }
}
