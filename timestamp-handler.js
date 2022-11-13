import fs, { write } from 'fs';
import { handleNonListEntry } from './song-handler.js';

async function processNewTimeStamp(currentSong, startTime) {
    if (Object.keys(currentSong).length === 0) {
        return;
    }
    const timestamp = createTimeStamp(startTime);
    let sessionData = await loadSessionData();

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

    await writeSessionDataToFile(sessionData);
    exportYouTubeTimestamps(sessionData);
}

async function setEntryAsPlayed(songHistory) {
    if (songHistory.items.length === 0) {
        return;
    }
    let sessionData = await loadSessionData();
    const items = songHistory.items;
    let temp = {};
    for(let y = 0; y < sessionData.length; y++) {
        if (!sessionData[y].played) {
            if (typeof items[0].nonlistSong === "string") {
                temp = await handleNonListEntry(items[0])
            } else {                    
                temp = items[0].song;
            }                    
            if (temp.artist === sessionData[y].artist && temp.title === sessionData[y].title) {         
                sessionData[y].played = true;
            } 
        }
    } 
    writeSessionDataToFile(sessionData);
    exportYouTubeTimestamps(sessionData);
}

async function writeSessionDataToFile(sessionData) {
    await fs.writeFileSync('sessiondata.json', JSON.stringify(sessionData), 'utf8'); 
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

async function updateCurrentEntry(sessionData, currentSong, revert = false) {
    for (let i = 0; i < sessionData.length; i++) {
        if (sessionData[i].id === currentSong.id && sessionData[i].played === false) {
            if (currentSong.timestamp !== undefined) {
                if (revert) {
                    let newStamp = sessionData[i].timestamp;
                    sessionData[i].timestamp = sessionData[i].lastTimestamp;
                    sessionData[i].lastTimestamp = newStamp;
                } else {
                    sessionData[i].lastTimestamp = sessionData[i].timestamp;
                    sessionData[i].timestamp = currentSong.timestamp;
                }
            }
            sessionData[i].modifier = currentSong.modifier;
        }
    }
    return sessionData;
}

function checkDuplicateEntry(sessionData, currentSong) {
    for (let i = 0; i < sessionData.length; i++) {
        if (sessionData[i].id === currentSong.id) {
            return true; 
        }
    }
}

async function loadSessionData() {
    var obj = JSON.parse(fs.readFileSync('sessiondata.json', 'utf8'));
    return obj;
}

async function resetSessionData() {
    const resetObj = []
    writeSessionDataToFile(resetObj);
}

function createTimeStamp(startTime) {
    return new Date(Date.now() - startTime).toISOString().substr(12,7);
}
export { processNewTimeStamp, setEntryAsPlayed, checkIfExistsAndUpdate, resetSessionData, revertTimestamp }