import fs from 'fs';
import path from 'path';

import io from 'socket.io-client';
import { GlobalKeyboardListener } from 'node-global-key-listener';
import chokidar from 'chokidar';
import mongoose from 'mongoose';
import chalk from 'chalk';
import 'dotenv/config'

import { initSession } from './models/session.model.js';
import { checkIfSongUpdate } from './models/song.model.js';
import {
    startNewSession,
    addTimeStamp,
    markLastPlayedSong,
    } from './controllers/session.controller.js';
import { openMainMenu } from './controllers/menu.controller.js';

chalk.level = 1;

const db = mongoose.connection;
db.addListener('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log(chalk.greenBright.italic('Connected to database'));
});

// This variable is changed by the watcher when a new file is created
// and also when a session is restored from the database in initSession() in session.model.js
// access the global variable SESSION_START that was declared in global.d.ts
global.SESSION_START = new Date(Date.now());

async function startUpRoutines() {
    let connStr = `mongodb+srv://${process.env['DB_USER']}:${process.env['DB_PWD']}@${process.env['DB_CLUSTER_PATH']! + process.env['DB_NAME'] + process.env['DB_CONN_PARAM']}`;
    await mongoose.connect(connStr);
    await initSession();
    await checkIfSongUpdate();
}

const v: any = new GlobalKeyboardListener();

const client = io(`https://api.streamersonglist.com`, {
    transports: ["websocket"]
});

client.on('connect', () => {
    console.log(chalk.green.italic(`Socket.io-client connection established with client Id: `) + chalk.white.italic.dim(client.id));
    // process.env.STREAMER_ID is the numeric `id` from `/streamers/<streamer-name` endpoint
    // but needs to be cast as a string for the socket event
    client.emit('join-room', `${process.env['STREAMER_ID']}`);
    
});
client.on('queue-update', () => {
    checkIfSongUpdate();
});

client.on('new-playhistory', async () => {
        markLastPlayedSong();
});
client.on('disconnect', () => {
    console.log(chalk.redBright(`Socket.io-client disconnected`));
}); 

// hotkey stuff
const detectHotkey = (e: any, down: any) => {
    if ((down["LEFT ALT"] || down["RIGHT ALT"])
        && (down["LEFT SHIFT"] || down["RIGHT SHIFT"])
        && (down["LEFT CTRL"] || down["RIGHT CTRL"])) {      
        
        if (e.state == "DOWN" && e.name == "T") {
            addTimeStamp();
        }
        if (e.state == "DOWN" && e.name == "R") {
            openMainMenu();
        }
    }  
}
v.addListener(detectHotkey);


// File Watching stuff
const watcher = chokidar.watch(`*${process.env['VOD_FILE_EXTENSION']}`, {
    persistent: true,
    followSymlinks: false,
    cwd: process.env['VOD_FOLDER']!,
    alwaysStat: true,
    useFsEvents: true
});

watcher.on('ready', async () => {
    const watched: any = await Object.values(watcher.getWatched())[1];
    
    if (watched.length > 0) {
        console.log(chalk.white.dim(`Initial folder scan complete. `) + chalk.magenta.bold.italic(watched.length) + chalk.magenta.italic(' files found.'));
        console.log(chalk.white.dim(`Watching for new files in `) + chalk.magenta.italic(process.env['VOD_FOLDER']));
        await fs.stat(path.join(process.env['VOD_FOLDER']!, watched.at(-1)), (err, stats) => {
            if (err) {
                throw err;
            }
            const twelveHoursAgo = new Date().getTime() - 1000 * 60 * 60 * 12;
            // convert stats.birthtimeMs to a date object and compare to twelveHoursAgo
            if (new Date(stats.birthtimeMs).getTime() > twelveHoursAgo) {
                setSESSION_START(new Date(stats.birthtimeMs));
            } else {
                setSESSION_STARTDefault();
            }
        });
    } else {
        setSESSION_STARTDefault();
    }    
    startUpRoutines();

    watcher.on('add', async (_, stats) => {
        if (stats) {
            setSESSION_START(stats.birthtime);
            startNewSession();
        }
    });
});

// A function that sets variable SESSION_START to parameter and console logs a message
async function setSESSION_START(time: Date) {
    global.SESSION_START = time;
    console.log(chalk.white.dim(`Session start time set to latest VOD creation time: `) + chalk.magenta.italic(new Date(global.SESSION_START)));
}

// A function that sets variable SESSION_START to a default parameter and console logs a message
function setSESSION_STARTDefault() {
    global.SESSION_START = new Date(Date.now());
    console.log(chalk.red.bold(`No viable files found. Session start time set to current time: `) + chalk.magenta.italic(new Date(global.SESSION_START)));
}