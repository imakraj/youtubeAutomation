const fs = require('fs');
const { google } = require('googleapis');

const clientSecretFile = 'client_secret.json';
const clientSecrets = JSON.parse(fs.readFileSync(clientSecretFile));

const OAuth2Client = new google.auth.OAuth2({
  clientId: clientSecrets.web.client_id,
  clientSecret: clientSecrets.web.client_secret,
  redirectUri: clientSecrets.web.redirect_uris[0]
});


const youtube = google.youtube({
  version: 'v3',
  auth: OAuth2Client,
});

function generateAuthUrl() {
  return OAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
  });
}

async function getAccessToken(code) {
    OAuth2Client.getToken(code, (error, tokens)=>{
    if(error) throw error
    console.log("successfully authenticated!");

    OAuth2Client.setCredentials(tokens);
   });
}


async function uploadVideo(filePath) {
  const fileSize = fs.statSync(filePath).size;
  const resumableUpload = await youtube.videos.insert(
    {
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: 'test video',
          description: 'test video',
        },
        status: {
          privacyStatus: 'private', // Set the privacy status as required
        },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    },
    {
      onUploadProgress: (event) => {
        const progress = (event.bytesRead / fileSize) * 100;
        console.log(`${progress.toFixed(2)}% uploaded`);
      },
    }
  );

  console.log('Video uploaded:', resumableUpload.data.snippet.title);
}

module.exports = {
  generateAuthUrl,
  getAccessToken,
  uploadVideo,
};
