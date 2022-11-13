import fs, { write } from 'fs';
import readline from 'readline';
import { handleNonListEntry } from './song-handler.js';

async function processNewTimeStamp(currentSong) {
    if (Object.keys(currentSong).length === 0) {
        return;
    }
    const timestamp = await getLatestTimeStamp();
    let sessionData = await loadSessionData();
  
    // Check if last sessions started more than 12 hours ago and reset it if it has
    if (await checkSessionExpired(sessionData.sessionTimeStarted)) {
        sessionData  = await resetSessionData();
    }

    //console.log(sessionData);

    sessionData = await addSessionEntry(sessionData, currentSong, timestamp);

    await writeSessionDataToFile(sessionData);

    exportYouTubeTimestamps(sessionData);
} 

async function checkIfExistsAndUpdate(currentSong) {    
    if (Object.keys(currentSong).length === 0) {
        return;
    }
    let sessionData = await loadSessionData();

    if (sessionData.entries.length === 0) {
        return;
    }

    if (checkDuplicateEntry(sessionData, currentSong)) {
        sessionData = await updateCurrentEntry(sessionData, currentSong);
    }

    await writeSessionDataToFile(sessionData);
    exportYouTubeTimestamps(sessionData);
}

async function setEntryAsPlayed(songHistory) {
    if (songHistory.items.length === 0) {
        return;
    }
    let sessionData = await loadSessionData();
    let entries = sessionData.entries;
    const items = songHistory.items;
    let temp = {};
    for(let y = 0; y < entries.length; y++) {
        if (!entries[y].played) {
            if (typeof items[0].nonlistSong === "string") {
                temp = await handleNonListEntry(items[0])
            } else {                    
                temp = items[0].song;
            }                    
            if (temp.artist === entries[y].artist && temp.title === entries[y].title) {         
                entries[y].played = true;
            } 
        }
    }
    sessionData.entries = entries; 
    writeSessionDataToFile(sessionData);
    exportYouTubeTimestamps(sessionData);
}

async function writeSessionDataToFile(sessionData) {
    await fs.writeFileSync('sessiondata.json', JSON.stringify(sessionData), 'utf8'); 
}

async function exportYouTubeTimestamps(sessionData) {
    const entries = sessionData.entries;
    let contents = "";

    if (!entries.length > 0) {
        return;
    }

    for (let i = 0; i < entries.length; i++) {
        contents += `${entries[i].timestamp} ${entries[i].title} `
        if (entries[i].artist.length > 0) {
            contents += `by ${entries[i].artist} `;
        }
        if (entries[i].modifier.length > 0) {
            contents += `// ${entries[i].modifier}`;
        }
        contents += `\r\n`;
    }
    
    console.log(contents);
    fs.writeFileSync('exported_youtube_timestamps.txt', contents, 'utf8');
}

async function addSessionEntry(sessionData, currentSong, timestamp) {
    if (currentSong.timestamp !== '0:00:00') {
        currentSong.timestamp = timestamp;
    }
    if (!checkDuplicateEntry(sessionData, currentSong)) {
        sessionData.entries.push(currentSong);
    } else {
        sessionData = await updateCurrentEntry(sessionData, currentSong);
    }
    return sessionData;
}

async function updateCurrentEntry(sessionData, currentSong) {
    const entries = sessionData.entries;
    for (let i = 0; i < entries.length; i++) {
        if (entries[i].id === currentSong.id && entries[i].played === false) {
            if (currentSong.timestamp !== '0:00:00' && currentSong.timestamp !== undefined) {
                entries[i].timestamp = currentSong.timestamp;
            }
            entries[i].modifier = currentSong.modifier;
        }
    }
    sessionData.entries = entries;
    return sessionData;
}

function checkDuplicateEntry(sessionData, currentSong) {
    const entries = sessionData.entries;
    for (let i = 0; i < entries.length; i++) {
        if (entries[i].id === currentSong.id) {
            return true; 
        }
    }
}

async function loadSessionData() {
    var obj = JSON.parse(fs.readFileSync('sessiondata.json', 'utf8'));
    return obj;
}

async function resetSessionData() {
    const resetObj = {
        sessionTimeStarted: Date.now(),
        entries: [],
    }
    return resetObj;
}

async function checkSessionExpired(sessionTimeStarted) {
    const sessionTimerCount = 1000 * 60 * 60 * 12;
    const sessionTimerAge = Date.now() - sessionTimerCount; 
    console.log(`SessionTimerAge: ${sessionTimerAge} - SessionTimeStarted: ${sessionTimeStarted}`)
    if (sessionTimerAge > sessionTimeStarted) {
        return true;
    }
    return false;
}

async function getLatestTimeStamp() {
    const timeStamps = [];
    const fileStream = fs.createReadStream('timestamp.txt');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let split = [];
    for await (const line of rl) {
        split = line.split(',');
        timeStamps.push(split[0]);
    }

    fs.writeFile('timestamp.txt', '', () => {});

    if (timeStamps.length > 0) {
        return(timeStamps[timeStamps.length-1]);
    } else {
        return "0:00:00";
    }
}
export { processNewTimeStamp, setEntryAsPlayed, checkIfExistsAndUpdate }