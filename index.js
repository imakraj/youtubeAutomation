const express = require('express');
const { getTimestampPairs, trimVideo, downloadVideo } = require('./youtubeAutomation');
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
    const selectedTimestampsInput = req.body.selectedTimestampsInput;

    if (!videoURL) {
        return res.status(400).json({ error: 'Video URL is required' });
    }

    const inputFile = await downloadVideo(videoURL);
    console.log("Trimmming Started");

    try {
        const selectedTimestamps = selectedTimestampsInput.split(';');
        let count = 1;
        for (const timestamp of selectedTimestamps) {
            const [startTime, endTime] = timestamp.split(',');
            console.log(startTime);
            console.log("-------------------------------");
            console.log(endTime);
            console.log("-------------------------------");
            const outputFile = `output_${count++}.mp4`;
            await trimVideo(inputFile, outputFile, startTime, endTime);
        }

        // res.status(200).json({ message: 'Video trimming process started successfully' });
        res.redirect('auth.html');

    } catch (error) {
        console.error('Error trimming video:', error);
        res.status(500).json({ error: 'Error trimming video' });
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

app.get('/timestamps', async (req, res) => {
    const videoURL = req.query.videoURL;
    if (!videoURL) {
        return res.status(400).json({ error: 'Video URL is required' });
    }

    try {
        const timestamps = await getTimestampPairs(videoURL);
        res.json(timestamps);
    } catch (error) {
        console.error('Error fetching timestamps:', error);
        res.status(500).json({ error: 'Error fetching timestamps' });
    }
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
