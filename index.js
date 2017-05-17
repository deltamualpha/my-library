var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var books = require('google-books-search');
var _ = require('lodash');

var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
var TOKEN_DIR = '.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-my-library.json';
var SHEET_ID = '1w5Dc57wV0_rrKFsG7KM-qdPWEpqYk6lFu3JzAA0cSv0';
var SHEET_NAME = 'Sheet1';

// Load client secrets from a local file.
fs.readFile(TOKEN_DIR + 'client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), inputLoop);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function inputLoop(auth) {
  insertRow(auth);
}

function insertRow(auth) {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('ISBN: ', function(isbn) {
    rl.close();
    books.search(isbn, {
      field: 'isbn',
      lang: 'en'
    }, function(error, results) {
      if ( ! error && results.length > 0 ) {
        console.log(results[0]);
        var book = normalizeGoogleData(results[0]);
        console.log(book);
        appendToSheet(auth, _.values(book));
      } else if ( results.length == 0 ) {
        console.log("no book found");
        inputLoop(auth);
      } else {
        console.log(error);
      }
    });
  });
}

function normalizeGoogleData(book) {
  return {
    title: book.subtitle ? book.title + ': ' + book.subtitle : book.title,
    author: _.join(book.authors, ', '),
    authorLast: book.authors ? _.lowerCase(_.head(_.reverse(_.split(book.authors[0], ' ')))) : '',
    "isbn-10": _.find(book.industryIdentifiers, { type: "ISBN_10" })
      ? _.find(book.industryIdentifiers, { type: "ISBN_10" }).identifier
      : '',
    "isbn-13": _.find(book.industryIdentifiers, { type: "ISBN_13" })
      ? _.find(book.industryIdentifiers, { type: "ISBN_13" }).identifier
      : '',
    format: '',
    genre: book.categories ? book.categories[0] : '',
    publisher: _.trim(book.publisher, '"'),
    series: '',
    volume: '',
    publishedDate: book.publishedDate ? book.publishedDate.substring(0, 4) : '',
    coverurl: '',
    description: book.description,
    notes: '',
    signed: ''
  };
}

function appendToSheet(auth, book) {
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.append({
    auth: auth,
    spreadsheetId: SHEET_ID,
    range: SHEET_NAME,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: {
      "range": SHEET_NAME,
      "majorDimension": "ROWS",
      "values": [
        book
      ]
    }
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
    }
    inputLoop(auth);
  });
}