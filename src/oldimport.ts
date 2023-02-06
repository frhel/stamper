import fs from 'fs';

import mongoose from 'mongoose';
import chalk from 'chalk';
import chokidar from 'chokidar';
import dotenv from 'dotenv';
dotenv.config();

import { Session } from './models/session.mongo.js';
import type { ISession } from './interfaces/ISession';
import type { ISong } from './interfaces/ISong';

chalk.level = 1;

const db = mongoose.connection;

db.addListener('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log(chalk.greenBright.italic.dim('Connected to database'));
});

async function initialize() {
    let connStr = `mongodb+srv://${process.env['DB_USER']}:${process.env['DB_PWD']}@${process.env['DB_CLUSTER_PATH']}stamper${process.env['DB_CONN_PARAM']}`;
    await mongoose.connect(connStr);

    await importAndSaveSessionToDatabase();
    //importDataFromFileByLinesAndReturnAsMap();
    //process.exit(0);

} initialize();

async function importAndSaveSessionToDatabase() {
    const sessionData = await importDataFromFileByLinesAndReturnAsMap();
    const success = await saveSessionToDatabase(sessionData);
    if (success) {
        console.log(chalk.magenta.bold('Successfully imported session data'));
    }
}

// read data from file and create new Session in database if it doesn't exist by checking the start time
// UNCOMMENT THIS AND USE IT TO FUCKING SAVE THE DATA TO THE DATABASE
async function saveSessionToDatabase(session: ISession): Promise<boolean> {
    // loop over Map and create new Session for each entry
    // upsert sessionObj as Session into database
    try {
        await Session.updateOne(
            {startTime: session.startTime},
            session,
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
async function importDataFromFileByLinesAndReturnAsMap(): Promise<ISession> {
    const data = fs.readFileSync('toImport.txt', 'utf8');
    const lines = data.split('\r\n');
    let session: ISession = {
        startTime: new Date(),
        yt_id: '',
        songs: [],
    };
    if (lines.length < 1) {
        console.log(chalk.redBright.italic('Error while importing data: No lines found'));
        return session;
    }
    session.startTime = await new Date(lines[0]!.split(', ').reverse().join(' ').slice(0, -2));
    console.log(session.startTime);
    session.yt_id = lines[1]!;

    let songs: ISong[] = [];
    let songInfo: ISong;
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i]!;
        const timeStamp = line.slice(0, 7);
        const rest = line.slice(8).trim().split('//');
        const songArr = rest[0]!.split(' by ');
        const title = songArr[0]!.toString().trim();
        const artist = songArr[1];
        const modifier = rest[1]?.toString().trim();
        songInfo = {
            artist: '',
            timestamps: [timeStamp],
            comment: '',
            timestampIndex: 0,
            title: title,
            modifier: '',
            isPlayed: false,
            request_id: 0,
        }
        if (artist && artist !== 'dippy2230') {
            songInfo.artist = artist.toString().trim();
        }
        if (modifier && modifier !== 'Cover') {
            songInfo.modifier = modifier;
        }
        // if (modifier && modifier.slice(0, -1) !== 'Cover') {
        //     songInfo.modifier = modifier.slice(0, -1);
        // }
        songInfo.isPlayed = true;
        songInfo.request_id = i;
        songs.push(songInfo);
    }
    session.songs = songs;
    return session;
}

// Improvised song with lyrics by dip

// File Change Watching stuff

const watcher = chokidar.watch('toImport.txt', {
    cwd: './',
    persistent: true,
    followSymlinks: false,
    alwaysStat: true,
    useFsEvents: true
});

watcher.on('ready', () => {
    watcher.on('change', async () => {
        console.log(chalk.yellowBright.italic.dim('File changed'));
        await importAndSaveSessionToDatabase();
    });
});


// // import data from json file and change timestamp to timestamps array
// async function importDataFromFileByLinesAndReturnAsMap() {
//     const data = await fs.promises.readFile('./backups/sessiondata -16-11-2022.json', 'utf8');
//     const json = JSON.parse(data);

//     const songs = new Map();
//     songs.set('startTime', new Date('2022-11-16T14:55:16.271Z'));
//     songs.set('yt_id', 'S8Azs7rKqng');

//     for (let i = 0; i < json.length; i++) {
//         json[i].timestamps = [json[i].timestamp];
//         json[i].timestampIndex = 0;
//         json[i].request_id = json[i].id;
//         delete json[i].id;
//         delete json[i].timestamp;
//         delete json[i].lastTimestamp;
//     }
//     songs.set('songs', json);
//     console.log(songs)
//     return songs;
// }