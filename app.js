import io from 'socket.io-client';
import { GlobalKeyboardListener } from 'node-global-key-listener';

import { updateCurrentSong, getSongHistory } from './song-handler.js';
import { processNewTimeStamp, setEntryAsPlayed, checkIfExistsAndUpdate } from './timestamp-handler.js';

// https://api.streamersonglist.com/docs/ for endpoints. 
const streamerId = 7325;

let currentSong = {};
let songHistory = {};

async function setInitialValues() {
    currentSong = await updateCurrentSong();
    songHistory = await getSongHistory();
}
setInitialValues();

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
    checkIfExistsAndUpdate(currentSong);
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
            processNewTimeStamp(currentSong);
        }, 1000);

        // Cycle the listener to prevent repeat keystrokes
        v.removeListener(detectHotkey);
        setTimeout(() => {
            v.addListener(detectHotkey);
        }, 200);
    }
}

v.addListener(detectHotkey);