# Gmail Unsnooze Web App Script

Automatically unsnoozes gmail threads snoozed by Inbox Zero app.


## Installation

- Go to [script link][script]
- Follow instructions.

(the link above is accessible only for @mindojo.com users for now)

[script]: https://script.google.com/a/macros/mindojo.com/s/AKfycbzSRaTA1xA5TlxbHgbrdt8aGLNxvUGON9Uwz-0UjlIquuA77m3o/exec


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
