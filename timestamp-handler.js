import fs from 'fs';
import readline from 'readline';

async function processNewTimeStamp() {
    const timestamp = await getLatestTimeStamp();
    
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