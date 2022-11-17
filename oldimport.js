import fs from 'fs';

import mongoose from 'mongoose';
import chalk from 'chalk';
import chokidar from 'chokidar';

import { settings } from './settings.js';

import { Session } from './session.mongo.js';

chalk.level = 1;

const db = mongoose.connection;

db.addListener('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log(chalk.greenBright.italic.dim('Connected to database'));
});

async function initialize() {
    await mongoose.connect(`mongodb+srv://${settings.db_user}:${settings.db_pwd}@${settings.db_cluster_path}`);

    //importAndSaveSessionToDatabase();
    //importDataFromFileByLinesAndReturnAsMap();

} initialize();

async function importAndSaveSessionToDatabase() {
    const sessionData = await importDataFromFileByLinesAndReturnAsMap();
    const success = await saveSessionToDatabase(sessionData);
    if (success) {
        console.log(chalk.magenta.bold('Successfully imported session data'));
    }
}
// import data from json file and change timestamp to timestamps array
async function importDataFromFileByLinesAndReturnAsMap() {
    const data = await fs.promises.readFile('./sessiondata -15-11-2022.json', 'utf8');
    const json = JSON.parse(data);
    
    const songs = new Map();
    songs.set('startTime', new Date('2022-11-16T14:55:16.271Z'));
    songs.set('yt_id', 'S8Azs7rKqng');

    for (let i = 0; i < json.length; i++) {
        let timeStamp = json[i].timestamp.split(':');
        timeStamp = new Date(songs.get('startTime').getTime()
            + (((timeStamp[0]*60 + +timeStamp[1]) * 60) + +timeStamp[2]) * 1000
        );
        json[i].timestamps = [ { current: timeStamp } ];
        delete json[i].timestamp;
        delete json[i].lastTimestamp;
    }
    songs.set('songs', json);
    console.log(songs)
    return songs;
}

// read data from file and create new Session in database if it doesn't exist by checking the start time
async function saveSessionToDatabase(songs) {    
    // loop over Map and create new Session for each entry
    let sessionObj = {
        startTime: songs.get('startTime'),
        yt_id: songs.get('yt_id'),
        songs: songs.get('songs'),
    }
    // upsert sessionObj as Session into database
    try {
        await Session.updateOne(
            {startTime: sessionObj.startTime},
            sessionObj,
            {upsert: true}
        );
    } catch (err) {
        console.log(chalk.redBright.italic('Error while saving session to database'));
        console.error(err);
        return false;
    }
    return true;    
}


// ** LEGACY IMPORT FUNCTION **
// async function importDataFromFileByLinesAndReturnAsMap() {
//     const data = fs.readFileSync('toImport.txt', 'utf8');
//     const lines = data.split('\r\n');
    
//     let returnMap = new Map();
//     returnMap.set('startTime', new Date(lines[0].split(', ').reverse().join(' ').slice(0, -2)));
//     returnMap.set('yt_id', lines[1]);
//     let songs = [];
//     for (let i = 2; i < lines.length; i++) {
//         const line = lines[i];
//         let timeStamp = line.slice(0, 7).split(':');
//         timeStamp = new Date(returnMap.get('startTime').getTime()
//             + (((timeStamp[0]*60 + +timeStamp[1]) * 60) + +timeStamp[2]) * 1000
//         );
//         const rest = line.slice(10).trim().split(' (');
//         const title = rest[0].split(' by ')[0];
//         const artist = rest[0].split(' by ')[1];
//         const modifier = rest[1];        
//         const songInfo = {};
//         songInfo.timestamps = [{current: timeStamp}];
//         songInfo.title = title;
//         if (artist) {
//             songInfo.artist = artist;
//         }
//         if (modifier && modifier.slice(0, -1) !== 'Cover') {
//             songInfo.modifier = modifier.slice(0, -1);
//         } 
//         songInfo.isPlayed = true;
//         songInfo.request_id = i;
//         songs.push(songInfo);  
//     }
//     returnMap.set('songs', songs);
//     return returnMap;
// }


// File Change Watching stuff

// const watcher = chokidar.watch('toImport.txt', {
//     ignored: ".mp4",
//     persistent: true,
//     followSymlinks: false,
//     alwaysStat: true,
//     useFsEvents: true
// });

const watcher2 = chokidar.watch('*.mkv', {
    ignored: ".mp4",
    cwd: 'E:\\VODs\\Temp',
    persistent: true,
    followSymlinks: false,
    alwaysStat: true,
    useFsEvents: true
});

watcher2.on('add', async (path, stats) => {
    console.log(chalk.greenBright.italic.dim(new Date(stats.birthtime).toISOString()));
});

// watcher.on('ready', async () => {
//     watcher.on('change', async (path, stats) => {
//         console.log(chalk.yellowBright.italic.dim('File changed'));
//         await importAndSaveSessionToDatabase();
//     });
// });