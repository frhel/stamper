import fs from 'fs';

import dotenv from 'dotenv';
dotenv.config();

import chalk from 'chalk';

import { getSessionData } from '../models/session.model.js';
import type { ISong } from '../interfaces/ISong';

chalk.level = 1;

function sortSongsByTimestamp(songs: ISong[]) {
    return songs.sort((a: ISong, b: ISong) => {
        return Number(a.timestamps[a.timestampIndex]!.split(':').join('')) - Number(b.timestamps[b.timestampIndex]!.split(':').join(''));
    })
}
async function exportYouTubeTrackList() {
    let session = await getSessionData();
    if (!session) {
        console.log(chalk.redBright.italic('Error while exporting timestamps: Session data is null'));
        return;
    }
    if (session && session.songs.length < 1) {
        console.log(chalk.redBright.italic('Error while exporting timestamps: Session data is empty'));
        return;
    }
    let songs = session.songs;
    let contents = "Track List:\r\n0:00:00 Stream Start\r\n";

    if (songs == null) {
        return;
    }

    songs = sortSongsByTimestamp(songs);

    for (let i = 0; i < songs.length; i++) {
        if (songs[i] != null) {
            contents += `${songs[i]!.timestamps[songs[i]!.timestampIndex]} ${songs[i]!.title} `
            if (songs[i]!.artist.length > 0) {
                contents += `by ${songs[i]!.artist} `;
            }
            if (songs[i]!.modifier.length > 0) {
                contents += `// ${songs[i]!.modifier}`;
            }
            contents += `\r\n`;
        }
    }
    
    console.log(contents);
    // write the contents of the contents variable to a file
    // in the chapter_exports directory with export_session.startTime.txt as the filename
    let dateString = session.startTime.toLocaleString('default', { month: 'long' }) + ' ' + session.startTime.getDay() + ', ' + session.startTime.getFullYear();
    let fileName = `${process.env['CHAPTER_EXPORT_FOLDER']}${dateString} - YouTube Track List.txt`;
    await fs
        .promises
        .writeFile(fileName, contents, 'utf8')
        .then(() => {
            console.log(chalk.greenBright.italic.dim(`Successfully exported track list to ${fileName}`));
        })
        .catch((err) => {
            console.log(chalk.redBright.italic.dim(`Error exporting track list to ${fileName}`));
            console.log(err);
        });
}

export { exportYouTubeTrackList };