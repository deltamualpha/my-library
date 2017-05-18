# library

set `publicSpreadsheetUrl` in `index.html` to set a sheet

expects the following columns, but easily updated:

* title
* author
* authorLast (used for sorting)
* isbn-10 (not displayed)
* isbn-13
* format
* genre
* publisher
* series
* volume
* year
* coverurl
* description
* notes
* signed (`yes` or blank)

## adding books using the google books API

1. update `SHEET_ID` and `SHEET_NAME` in `index.js`.
2. follow the instructions at <https://developers.google.com/sheets/api/quickstart/nodejs#step_1_turn_on_the_api_name>, and save the resulting json file to `.credentials/client_secret.json`.
3. run `npm install`.
4. run `npm start`.
