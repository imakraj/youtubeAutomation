const express = require('express');
const { getStampsAndTrim } = require('./youtubeAutomation');
const { generateAuthUrl, getAccessToken, uploadVideo } = require('./youtubeUpload');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/trim-video', async (req, res) => {
    const videoURL = req.body.videoURL;
    console.log(videoURL);

    // if (!videoURL) {
    //     return res.status(400).json({ error: 'Video URL is required' });
    // }

    try {
        await getStampsAndTrim(videoURL, 'trimmed.mp4');

        // res.redirect('upload.html');
        res.redirect('auth.html');
    } catch (error) {
        console.error('Error trimming video:', error);
        res.status(500).json({ error: error });
    }

});

app.get('/auth', (req, res) => {
    const authUrl = generateAuthUrl();
    res.redirect(authUrl);
});

app.get('/google/callback', async (req, res) => {
    const code = req.query.code;
    try {
        await getAccessToken(code);
        res.redirect('/upload.html');
    } catch (error) {
        console.error('Error exchanging authorization code for access tokens:', error);
        res.status(500).send('Error exchanging authorization code for access tokens');
    }
});

app.post('/upload', async (req, res) => {
    const videoPath = req.body.videoPath;
    console.log('Uploading video:', videoPath);

    try {
        await uploadVideo(videoPath);
        res.status(200).json({ message: 'Video uploaded successfully' });
    } catch (error) {
        console.error('Error uploading video:', error);
        res.status(500).json({ error: error });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
