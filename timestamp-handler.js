import fs from 'fs';
import readline from 'readline';

async function processNewTimeStamp(currentSong, songHistory) {
    const timestamp = await getLatestTimeStamp();
    const sessionData = await loadSessionData();

    console.log(sessionData);

    await addSessionEntry(sessionData, currentSong, timestamp);
}

async function addSessionEntry(sessionData, currentSong, timestamp) {
    currentSong.timestamp = timestamp;
    sessionData.entries.push(currentSong);
    fs.writeFileSync('sessiondata.json', JSON.stringify(sessionData), 'utf8'); 
}

async function loadSessionData() {
    var obj = JSON.parse(fs.readFileSync('sessiondata.json', 'utf8'));
    
    // Check if last sessions started more than 12 hours ago and reset it if it has
    if (await checkSessionExpired(obj.sessionTimeStarted)) {
        await resetSessionData();
    }

    return obj;
}

async function resetSessionData() {
    const resetObj = {
        sessionTimeStarted: Date.now(),
        entries: [],
    }
    fs.writeFileSync('sessiondata.json', JSON.stringify(resetObj), 'utf8');
}

async function checkSessionExpired(sessionTimeStarted) {
    const sessionTimerCount = 1000 * 60 * 60 * 12;
    const sessionTimerAge = Date.now() - sessionTimerCount;
    console.log(sessionTimerAge);
    if (sessionTimerAge > sessionTimeStarted) {
        return true;
    }
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
export { processNewTimeStamp }