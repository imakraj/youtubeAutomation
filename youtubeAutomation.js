const fs = require('fs').promises;
const ytdl = require('ytdl-core');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const { log, time } = require('console');
const path = require('path');
ffmpeg.setFfmpegPath(ffmpegPath);

const videoURL = 'https://www.youtube.com/watch?v=f7Lfukf0IKY';

let videoTitle;

async function checkFileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        return false;
    }
}

async function downloadVideo(videoUrl) {
    try {
        const video = ytdl(videoUrl, { filter: 'audioandvideo', quality: 'highestvideo' });
        const info = await ytdl.getInfo(videoUrl);
        videoTitle = info.videoDetails.title;
        // const fileName = `${videoTitle}video.mp4`;
        const folderName = 'assets';
        const fileName = path.join(folderName, `${videoTitle}video.mp4`);

        // Check if the file already exists
        const fileExists = await checkFileExists(fileName);
        if (fileExists) {
            console.log('File already exists. Skipping download.');
            return fileName;
        }

        const data = await new Promise((resolve, reject) => {
            let chunks = [];
            video.on('data', (chunk) => {
                chunks.push(chunk);
            });
            video.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            video.on('error', (error) => {
                reject(error);
            });
        });

        await fs.mkdir(folderName, { recursive: true });
        await fs.writeFile(fileName, data);

        // await fs.writeFile(fileName, data);

        console.log('Download complete');

        return fileName;
    } catch (error) {
        console.error('Error downloading video:', error);
        throw error;
    }
}

function calculateDuration(startTime, endTime) {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    return end - start;
}

function parseTime(time) {
    const timeParts = time.split(':').map(parseFloat);
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (timeParts.length === 3) {
        [hours, minutes, seconds] = timeParts;
    } else if (timeParts.length === 2) {
        [minutes, seconds] = timeParts;
    } else {
        throw new Error('Invalid time format');
    }

    return hours * 3600 + minutes * 60 + seconds;
}

const secondsToHHMMSS = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours === 0) {
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
};

async function trimVideo(inputFile, outputFile, startTime, endTime) {
    const folderName = path.join('assets', 'uploads');
    const outputFileName = path.join(folderName, path.basename(outputFile));

    await fs.mkdir(folderName, { recursive: true });

    return new Promise((resolve, reject) => {
        const duration = calculateDuration(startTime, endTime);
        ffmpeg(inputFile)
            .setStartTime(startTime)
            .duration(duration)
            .output(outputFileName)
            .on('end', function () {
                console.log('Trimming complete');
                resolve();
            })
            .on('error', function (err) {
                console.error('Error trimming video:', err);
                reject(err);
            })
            .run();
    });
}

const findTimestamps = (desc, duration) => {
    const timestamps = [];
    const regex = /(\d+:\d+:\d+)|(\d+:\d+)/g;

    let match;
    while ((match = regex.exec(desc)) !== null) {
        timestamps.push(match[0]);
    }

    timestamps.push(duration);

    return timestamps;
}

const getTimestampPairs = async (url) => {
    try {
        const info = await ytdl.getInfo(url);
        const description = info.videoDetails.description;
        const duration = secondsToHHMMSS(info.videoDetails.lengthSeconds);

        const timestamps = findTimestamps(description, duration);
        const timestampPairs = [];

        if (timestamps.length > 0) {
            for (let i = 0; i < timestamps.length - 1; i++) {
                const startTime = timestamps[i];
                const endTime = timestamps[i + 1];
                timestampPairs.push({ startTime, endTime });
            }
        }

        return timestampPairs;
    } catch (error) {
        console.error('Error fetching timestamps from video:', error);
        throw error;
    }
};


module.exports = { getTimestampPairs, trimVideo, downloadVideo };





