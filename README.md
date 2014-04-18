# Gmail Unsnooze Web App Script

Automatically unsnoozes gmail threads snoozed by Inbox Zero app.


## Installation

- Go to [script link][script]
- Follow instructions.

(the link above is accessible only for @mindojo.com users for now)

[script]: https://script.google.com/macros/s/AKfycbxweRx_XufZ6PhxzR59LSYKe8IhJK4NYqyLNIlhJUCLz978WNBO/exec


## Recreation from source code

First you need to create a project in your google docs:

1. Go to Google Docs.
2. Create new spreadsheet.
3. Go to Tools -> Script editor...
4. Choose new "Script as Web App"
5. Copy code from `Code.gs` to editor window.
6. Create new html file (File -> New -> html file), called `index`.
7. Copy paste code from `index.html` to editor window.
8. Save all.

Then publish it as Web App:

1. Go to File -> Manage Versions... and create a new version.
2. Go to Publish -> Deploy as web app... and there:
    - select version you just created
    - set "Execute the app" to "User accessing the web app"
    - set who can access the app appropriately
    - click Deploy
3. Save web app link for later use


## Publish a new web app version

1. Open spreadsheet with unsnooze script.
2. Go to Tools -> Script editor...
3. Change code.
4. Then publish as web app as described earlier.

Script will be republished with same url.
