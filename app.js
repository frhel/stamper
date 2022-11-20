import fs from 'fs';
import path from 'path';

import io from 'socket.io-client';
import { GlobalKeyboardListener } from 'node-global-key-listener';
import chokidar from 'chokidar';
import mongoose from 'mongoose';
import chalk from 'chalk';

import { settings } from './settings.js';

import { initSession } from './session.model.js';
import { checkIfSongUpdate } from './song.controller.js';
import {
    startNewSession,
    addTimeStamp,
    markLastPlayedSong,
    openMainMenu,
    } from './session.controller.js';

chalk.level = 1;

const db = mongoose.connection;
db.addListener('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log(chalk.greenBright.italic('Connected to database'));
});

// https://api.streamersonglist.com/docs/ for endpoints.
const streamerId = Number(settings.streamerId);

global.SESSION_START = 0;

async function startUpRoutines() {
    await mongoose.connect(`mongodb+srv://${settings.db_user}:${settings.db_pwd}@${settings.db_cluster_path + settings.db_name + settings.db_connection_params}`);
    await initSession();
    await checkIfSongUpdate();
}

const v = new GlobalKeyboardListener();

const client = io(`https://api.streamersonglist.com`, {
    transports: ["websocket"]
});

client.on('connect', () => {
    console.log(chalk.green.italic(`Socket.io-client connection established with client Id: `) + chalk.white.italic.dim(client.id));
    // streamerId is the numeric `id` from `/streamers/<streamer-name` endpoint
    // but needs to be cast as a string for the socket event
    client.emit('join-room', `${streamerId}`);
    
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
const detectHotkey = (e, down) => {
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
const watcher = chokidar.watch('*.mkv', {
    ignored: ".mp4",
    persistent: true,
    followSymlinks: false,
    cwd: "E:\\VODs\\Temp\\",
    alwaysStat: true,
    useFsEvents: true
});

watcher.on('ready', async () => {
    const watched = await Object.values(watcher.getWatched())[1];
    console.log(chalk.white.dim(`Initial folder scan complete. `) + chalk.magenta.bold.italic(watched.length) + chalk.magenta.italic(' files found.'));
    console.log(chalk.white.dim(`Watching for new files in `) + chalk.magenta.italic(settings.temp_vod_folder));
    
    if (watched.length > 0) {
        await fs.stat(path.join(settings.temp_vod_folder, watched.at(-1)), (err, stats) => {
            if (err) {
                throw err;
            }
            const twelveHoursAgo = new Date().getTime() - 1000 * 60 * 60 * 12;
            // convert stats.birthtimeMs to a date object and compare to twelveHoursAgo
            if (new Date(stats.birthtimeMs) > twelveHoursAgo) {
                setSESSION_START(new Date(stats.birthtimeMs));
            } else {
                setSESSION_STARTDefault();
            }
        });
    } else {
        setSESSION_STARTDefault();
    }    
    startUpRoutines();

    watcher.on('add', async (path, stats) => {
        if (stats) {
            setSESSION_START(+stats.birthtime);
            startNewSession();
        }
    });
});

// A function that sets variable SESSION_START to parameter and console logs a message
async function setSESSION_START(time) {
    global.SESSION_START = time;
    console.log(chalk.white.dim(`Session start time set to latest VOD creation time: `) + chalk.magenta.italic(new Date(global.SESSION_START)));
}

// A function that sets variable SESSION_START to a default parameter and console logs a message
function setSESSION_STARTDefault() {
    global.SESSION_START = Date.now();
    console.log(chalk.red.bold(`No viable files found. Session start time set to current time: `) + chalk.magenta.italic(new Date(global.SESSION_START)));
}