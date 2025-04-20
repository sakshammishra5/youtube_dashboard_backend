const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:5000/auth/callback'
);

const youtube = google.youtube({
  version: 'v3',
  auth: oauth2Client,
});

module.exports = { youtube, oauth2Client };