import io from 'socket.io-client';
import { GlobalKeyboardListener } from 'node-global-key-listener';
import chokidar, { watch } from 'chokidar';

import { updateCurrentSong, getSongHistory } from './song-handler.js';
import {
    processNewTimeStamp,
    setEntryAsPlayed,
    checkIfExistsAndUpdate,
    resetSessionData,
    revertTimestamp
    } from './timestamp-handler.js';

// https://api.streamersonglist.com/docs/ for endpoints. 
const streamerId = 7325;

let currentSong = {};
let songHistory = {};
let startTime = 0;

async function setInitialValues() {
    resetSessionData();
    currentSong = await updateCurrentSong();
    songHistory = await getSongHistory();
}

const v = new GlobalKeyboardListener();

const client = io(`https://api.streamersonglist.com`, {
    transports: ["websocket"]
});

client.on('connect', () => {
    console.log(`Socket.io-client connection initialized with client Id: ${client.id}`);
    // streamerId is the numeric `id` from `/streamers/<streamer-name` endpoint
    // but needs to be cast as a string for the socket event
    client.emit('join-room', `${streamerId}`);
    
});
client.on('queue-update', async () => {
    currentSong = await updateCurrentSong();
    checkIfExistsAndUpdate(currentSong, startTime);
});
client.on('new-playhistory', async () => {
    songHistory = await getSongHistory();
    setEntryAsPlayed(songHistory);

});
client.on('disconnect', () => {
    console.log(`Socket.io-client disconnected`);
}); 

// Log keystrokes

// v.addListener(function (e, down) {
//     console.log(
//         `${e.name} ${e.state == "DOWN" ? "DOWN" : "UP  "} [${e.rawKey._nameRaw}]`
//     )
// });

const detectHotkey = (e, down) => {
    if (e.state == "DOWN" && e.name == "T" 
        && (down["LEFT ALT"] || down["RIGHT ALT"])
        && (down["LEFT SHIFT"] || down["RIGHT SHIFT"])
        && (down["LEFT CTRL"] || down["RIGHT CTRL"])) {
        
        setTimeout(() => {            
            processNewTimeStamp(currentSong, startTime);
        }, 1000);

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
        
        setTimeout(() => {          
            revertTimestamp(currentSong);
        }, 1000);

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

watcher.on('add', (path, stats) => {  
    if (stats) {
        startTime = stats.birthtime;
        setInitialValues();
        console.log(`New session initialized at ${new Date(startTime)}`)
    }
});
