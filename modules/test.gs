function bazz() {
    Logger.log('Bazz!')
}

var fooNamespace = {
    bar: function() {
        Logger.log('Bar!')
    },

    foo: function(data) {
        Logger.log('Foo!' + data)
    },

    funcWithIntendedError: function() {
        HtmlService.createHtmlOutputFromFile('wrong_file');
    }
}
