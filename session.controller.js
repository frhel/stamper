import fs, { write } from 'fs';

import { createNewSession, loadSessionData } from './session.model.js';
import { getCurrentSong, getLastPlayedSong } from './song.controller.js';

async function startNewSession(startTime) {
    await createNewSession();
}

async function addSong() {
    
}

async function addTimeStamp() {
    const session = await loadSessionData();
    let currentSong = getCurrentSong()
    if (Object.keys(currentSong).length === 0) {
        return;
    }
    const timestamp = createTimeStamp(startTime);

    sessionData = await addSessionEntry(sessionData, currentSong, timestamp);

    await writeSessionDataToFile(sessionData);

    exportYouTubeTimestamps(sessionData);
}

function sortSessionDataByTime(sessionData) {
    return sessionData.sort((a, b) => {
        return a.timestamp.split(':').join('') - b.timestamp.split(':').join('');
    })
}

async function revertTimestamp(currentSong) {
    checkIfExistsAndUpdate(currentSong, true);
}


async function checkIfExistsAndUpdate(currentSong, revert = false) {    
    if (Object.keys(currentSong).length === 0) {
        return;
    }
    let sessionData = await loadSessionData();

    if (sessionData.length === 0) {
        return;
    }

    if (checkDuplicateEntry(sessionData, currentSong)) {
        sessionData = await updateCurrentEntry(sessionData, currentSong, revert);
    }
}

async function setEntryAsPlayed() {
    const song = await getLastPlayedSong();
    if (!song) {
        return;
    }
    let session = await loadSessionData();
    let songs = session.songs;
    const items = songHistory.items;
    for(let y = 0; y < songs.length; y++) {
        if (!songs[y].played) {                  
            if (song.artist === songs[y].artist && song.title === songs[y].title) {         
                songs[y].played = true;
            } 
        }
    }
}

async function exportYouTubeTimestamps(sessionData) {
    let contents = "Track List:\r\n0:00:00 Stream Start\r\n";

    if (!sessionData.length > 0) {
        return;
    }
    
    sessionData = sortSessionDataByTime(sessionData);

    for (let i = 0; i < sessionData.length; i++) {
        contents += `${sessionData[i].timestamp} ${sessionData[i].title} `
        if (sessionData[i].artist.length > 0) {
            contents += `by ${sessionData[i].artist} `;
        }
        if (sessionData[i].modifier.length > 0) {
            contents += `// ${sessionData[i].modifier}`;
        }
        contents += `\r\n`;
    }
    
    console.log(contents);
    fs.writeFileSync('exported_youtube_timestamps.txt', contents, 'utf8');
}

async function addSessionEntry(sessionData, currentSong, timestamp) {
    currentSong.timestamp = timestamp;
    if (!checkDuplicateEntry(sessionData, currentSong)) {
        sessionData.push(currentSong);
    } else {
        sessionData = await updateCurrentEntry(sessionData, currentSong);
    }
    return sessionData;
}

function checkDuplicateEntry(songs, song) {
    for (let i = 0; i < songs.length; i++) {
        if (songs[i].id === song.id) {
            return true; 
        }
    }
}

function createTimeStamp(startTime) {
    return new Date(Date.now() - startTime).toISOString().substr(12,7);
}
export { addTimeStamp, setEntryAsPlayed, revertTimestamp, startNewSession }