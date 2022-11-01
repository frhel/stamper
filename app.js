import io from 'socket.io-client';
import { updateCurrentSong, getSongHistory } from './song-handler.js';
import { processNewTimeStamp } from './timestamp-handler.js';

// https://api.streamersonglist.com/docs/ for endpoints. 
const streamerId = 7325;

let currentSong = {};
let songHistory = {};

async function setInitialValues() {
    currentSong = await updateCurrentSong();
    songHistory = await getSongHistory();
    pushButton();
}
setInitialValues();

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
    currentSong = updateCurrentSong();
});
client.on('new-playhistory', async () => {
    songHistory = getSongHistory();
});
client.on('disconnect', () => {
    console.log(`Socket.io-client disconnected`);
});

function pushButton() {
    processNewTimeStamp();
}

