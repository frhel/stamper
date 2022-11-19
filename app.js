import fs from 'fs';
import path from 'path';

import io from 'socket.io-client';
import { GlobalKeyboardListener } from 'node-global-key-listener';
import chokidar from 'chokidar';
import mongoose from 'mongoose';
import chalk from 'chalk';

import { settings } from './settings.js';

import {
    startNewSession,
    addTimeStamp,
    setEntryAsPlayed,
    revertTimestamp
    } from './session.controller.js';

chalk.level = 1;

const db = mongoose.connection;
db.addListener('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log(chalk.greenBright.italic('Connected to database'));
});

// https://api.streamersonglist.com/docs/ for endpoints.
const streamerId = Number(settings.streamerId);

let startTime = 0;

async function startUpRoutines() {
    await mongoose.connect(`mongodb+srv://${settings.db_user}:${settings.db_pwd}@${settings.db_cluster_path + settings.db_name + settings.db_connection_params}`);

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
client.on('new-playhistory', async () => {
    setEntryAsPlayed();

});
client.on('disconnect', () => {
    console.log(chalk.redBright(`Socket.io-client disconnected`));
}); 



// hotkey stuff
const detectHotkey = (e, down) => {
    if (e.state == "DOWN" && e.name == "T" 
        && (down["LEFT ALT"] || down["RIGHT ALT"])
        && (down["LEFT SHIFT"] || down["RIGHT SHIFT"])
        && (down["LEFT CTRL"] || down["RIGHT CTRL"])) {
                   
        addTimeStamp();

        // Cycle the listener to prevent repeat keystrokes
        v.removeListener(detectHotkey);
        setTimeout(() => {
            v.addListener(detectHotkey);
        }, 200);
    }

    if (e.state == "DOWN" && e.name == "R" 
        && (down["LEFT ALT"] || down["RIGHT ALT"])
        && (down["LEFT SHIFT"] || down["RIGHT SHIFT"])
        && (down["LEFT CTRL"] || down["RIGHT CTRL"])) {
                
        revertTimestamp();

        // Cycle the listener to prevent repeat keystrokes
        v.removeListener(detectHotkey);
        setTimeout(() => {
            v.addListener(detectHotkey);
        }, 200);
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
    console.log(chalk.magenta(`Initial folder scan complete. `) + chalk.white.bold(watched.length) + chalk.magenta(' files found.'));
    console.log(chalk.yellow(`Watching for new files in `) + chalk.white.underline(settings.temp_vod_folder));
    
    if (watched.length > 0) {
        await fs.stat(path.join(settings.temp_vod_folder, watched.at(-1)), (err, stats) => {
            if (err) {
                throw err;
            }
            startTime = stats.birthtimeMs;
            console.log(chalk.magenta(`Session start time restored to latest VOD creation time: `) + chalk.white.underline(new Date(startTime)));
        });
    } else {
        startTime = Date.now();
        console.log(chalk.red.bold(`No files found. Session start time set to current time: `) + chalk.white.underline(new Date(startTime)));
    }    
    startUpRoutines();

    watcher.on('add', async (path, stats) => {
        if (stats) {
            startTime = +stats.birthtime;
            startNewSession(startTime);
        }
    });
});