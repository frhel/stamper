import chalk from 'chalk';
import inquirer from 'inquirer';

import { createNewSession, getSessionData, saveSessionData, backupSessions } from './session.model.js';
import { getCurrentSong, getLastPlayedSong } from './song.controller.js';
import { exportYouTubeTrackList } from './youtube.controller.js';

chalk.level = 1;

let doublePressPrompt = false; // Variable to prevent multiple prompts from being made

// function to start a new session - calls the createNewSession function from the session.model.js file
async function startNewSession() {
    await createNewSession(); // Create a new session in the database in session.model.js
}

// function to add the current song to the session data
function addSongToSession(session, song) {
    session.songs.push(song); // Add new song to the end of the songs array
    return session; // Return the updated session
}

// function to add a new timestamp that is called on a keyboard event (ctrl + alt + shift + t)
async function addTimeStamp() {
    // has a flow for adding current song to the session data, then adding a timestamp to that song.
    // If the song is already in the session data, it will add a timestamp to that existing song
    // Will check if you really want to add a new timestamp to the song if one already exists

    const timestamp = createTimeStamp(); // Returns string in the format of '0:00:00'

    // Get the current song from the song queue on streamersonglist.com
    let song = getCurrentSong(); // Returns an object with the current song's data from streamersonglist.com
    // Check if the queue is empty and do nothing if it is
    if (Object.keys(song).length === 0) {
        console.log('Nothing changed. '+chalk.red.italic('Queue currently empty'));
        return; 
    }    
    let session = await getSessionData(); // Load the session data from database    
    let songIndex = checkIfSongInSession(session, song); // returns -1 if the song is not in the session data

    // If the song does not exist in the session data, add it to the session data and return the index of the new song
    if (songIndex === -1) {
        console.log(chalk.yellow.italic('Adding new song to session'));
        session = addSongToSession(session, song); // returns the updated session with the new song added
        songIndex = session.songs.length - 1; // set the index of the new song to the last index in the array
    }

    song = session.songs[songIndex]; // Set song as the song object from the session data

    if ((song.timestamps.length > 0 || song.timestampIndex < song.timestamps.length - 1) && doublePressPrompt === false) {
        // If the song already has a timestamp, ask if you want to add a new one
        console.log(`${chalk.red.italic.underline('Timestamp already exists for')} ${chalk.cyan.bold.italic(song.title)} by ${chalk.cyan.bold.italic(song.artist)}`);
        console.log(chalk.yellow.bold.italic('Press again to confirm new timestamp'));
        doublePressPrompt = true; // Set doublePressPrompt to true to prevent multiple prompts
        return;
    } else {
        song = pushNewTimestampToSong(song, timestamp); // returns the updated song with the new timestamp added
        doublePressPrompt = false; // Reset doublePressPrompt to false to allow for new prompts to be made
    }

    session.songs[songIndex] = song; // Update the session data with the new song

    if (await saveSessionData(session)) { // Save the updated session data to the database and inform the user
        console.log(`[${chalk.white.bold(timestamp)}] added to ${chalk.cyan.bold.italic(song.title)} by ${chalk.cyan.bold.italic(song.artist)}`);
    } else {
        console.log(chalk.red.italic('Failed to push new timestamp to database'));
        console.log(chalk.red.italic.underline('Timestamp not added'));
    }
}

// function to update the modifier of the current song if it changes in the song queue
async function updateSessionOnSongChange() {
    const song = getCurrentSong(); // Get the current song from the song queue on streamersonglist.com
    if (!song.title) {
        // console.log(chalk.red.italic('No song in Session Data to update'));
        return;
    }
    let session = await getSessionData(); // Load the session data from database
    let songIndex = checkIfSongInSession(session, song); // returns -1 if the song is not in the session data
    if (songIndex === -1) { // Return if the current song has not been added to the session data - it might be a new song
        return;
    } else { // If the song is in the session data, check if the song modifier has changed
        if (session.songs[songIndex].modifier !== song.modifier && session.songs[songIndex].isPlayed === false) {
            session.songs[songIndex].modifier = song.modifier;
            console.log(chalk.yellow.italic(`Updated modifiers for ${chalk.cyan.bold.italic(song.title)} by ${chalk.cyan.bold.italic(song.artist)} to ${chalk.magenta.bold.italic(song.modifier)}`));
        }
    }
    if (!await saveSessionData(session)) { // Save the updated session data to the database (silently)
        console.log(chalk.red.italic('Failed to update session data')); // Inform the user if the save failed
    }
}

// function to mark the last played song as played in the session data when the song is marked as played on streamersonglist.com
async function markLastPlayedSong() {
    const song = await getLastPlayedSong();
    if (!song.title) {
        console.log(chalk.red.italic('No song to mark as last played'));
        return;
    }
    let session = await getSessionData();
    let songs = session.songs;
    for(let i = 0; i < songs.length; i++) {
        if (!songs[i].isPlayed) {                  
            if (song.artist === songs[i].artist && song.title === songs[i].title) {         
                songs[i].isPlayed = true;
                session.songs = songs;
                if (await saveSessionData(session)) {
                    console.log(`${chalk.cyan.bold.italic(song.title)} by ${chalk.cyan.bold.italic(song.artist)} marked as played`);
                    return;
                }                    
            } 
        }
    }
    console.log(chalk.red.italic('Failed to mark song as played - song not found or already marked as played'));
    return;
}

// function to add a new timestamp to the end of the song's timestamps array and set it as the current timestamp
function pushNewTimestampToSong(song, timestamp) {
    song.timestamps.push(timestamp);
    song.timestampIndex = song.timestamps.length - 1;
    return song;
}

// function to check if the song already exists in the session data
function checkIfSongInSession(session, song) {
    for (let i = 0; i < session.songs.length; i++) {
        if (session.songs[i].request_id === song.request_id) {
            return i; // return the index of the song in the session data
        }
    }    
    return -1; // return -1 if the song is not in the session data
}

// function to create a new timestamp from the session start time - current time
function createTimeStamp() {
    // Creates a timestamp in the format of '0:00:00' from 
    // the difference between the current time and the start time
    const timeStamp = new Date(Date.now() - global.SESSION_START).toISOString().substr(12,7);
    return timeStamp;
}

// Open a menu to allow the user to change the current song's to a different one
async function selectNewTimestampIndex() {
    let session = await getSessionData();
    // Iterate through the songs array and use inquirer to generate a selection menu for which song to select with latest as default
    // Then create another menu for which timestamp to select with current timestampIndex as default
    // Then update the timestampIndex in the session data and save it to the database
    inquirer.prompt([
        {
            type: 'list',
            name: 'song',
            message: `Select a song to ${chalk.magenta.italic('EDIT')}`,
            choices: [
                {
                    name: 'Cancel',
                    value: -1
                }
            ].concat(session.songs.map(song => {
                return {
                    name: `[${chalk.white.bold(song.timestamps[song.timestampIndex])}] ${chalk.cyan.bold.italic(song.title)} by ${chalk.cyan.bold.italic(song.artist)}`,
                    value: session.songs.indexOf(song)
                }
            }).reverse())
        }
    ]).then(async answer => {
        if (answer.song === -1) {
            console.log(chalk.yellow.dim('Cancelled timestamp selection'));
            return;
        }
        const song = session.songs[answer.song];
        let curr = ` `;
        inquirer.prompt([
            {
                type: 'list',
                name: 'timestamp',
                message: `Select a new timestamp for ${chalk.cyan.bold.italic(song.title)} by ${chalk.cyan.bold.italic(song.artist)}`,
                choices: [
                    {
                        name: 'Cancel',
                        value: -1
                    }
                ].concat(song.timestamps.map(timestamp => {
                    if (song.timestamps.indexOf(timestamp) === song.timestampIndex) {
                        curr = `${chalk.cyan.italic.dim('Current timestamp')}`;
                        timestamp = `${chalk.cyan.bold(timestamp)}`;
                    } else {
                        curr = ' ';
                    }
                    return {
                        name: `${timestamp} ${curr}`,
                        value: song.timestamps.indexOf(timestamp)
                    }
                }).reverse())
            }
        ]).then(async answer => {            
            if (answer.timestamp === -1) {
                console.log(chalk.yellow.dim('Cancelled timestamp selection'));
                return;
            }
            song.timestampIndex = answer.timestamp;
            session.songs[answer.song] = song;
            if (await saveSessionData(session)) {
                console.log(`Updated ${chalk.cyan.bold.italic(song.title)} by ${chalk.cyan.bold.italic(song.artist)} to ${chalk.magenta.bold.italic(song.timestamps[song.timestampIndex])}`);
            } else {
                console.log(chalk.red.italic('Failed to update session data'));
            }
        }).catch(error => {
            console.log(chalk.red.italic('Failed to select timestamp'));
            console.log(chalk.red.italic.underline(error));
        })
    }).catch(error => {
        console.log(chalk.red.italic('Failed to select song'));
        console.log(chalk.red.italic.underline(error));
    })
}

// Open a menu to allow the user to delete a song from the current session
async function deleteSongFromSession() {
    let session = await getSessionData();
    // Use inquirer to generate a selection menu for which song to delete
    // Then remove the song from the session data and save it to the database
    // Make Cancel the first option in the menu
    inquirer.prompt([
        {
            type: 'list',
            name: 'song',
            message: `Select a song to ${chalk.red.bold.italic('DELETE')}`,
            choices: [
                {
                    name: 'Cancel',
                    value: -1
                }
            ].concat(session.songs.map(song => {
                return {
                    name: `${song.title} by ${song.artist} - ${song.timestamps[song.timestampIndex]}`,
                    value: session.songs.indexOf(song)
                }
            }).reverse())
        }
    ]).then(async answer => {
        if (answer.song === -1) {
            console.log(chalk.yellow.dim('Cancelled - no song deleted'));
            return;
        }        
        const song = session.songs[answer.song]; // Get the selected song from the session data
        inquirer.prompt([
            {
                type: 'list',
                name: 'confirm',
                message: `Select a new timestamp for ${chalk.cyan.bold.italic(song.title)} by ${chalk.cyan.bold.italic(song.artist)}`,
                choices: [
                    {
                        name: 'Yes',
                        value: 1
                    },
                    {
                        name: 'No',
                        value: 0
                    }
                ]
            }
        ]).then(async answer => {
            if (answer.confirm === 1) {
                session.songs.splice(answer.song, 1); // Remove the song from the session data
                if (await saveSessionData(session)) {
                    console.log(`Deleted ${chalk.red.bold.italic(song.title)} by ${chalk.red.bold.italic(song.artist)}`);
                } else {
                    console.log(chalk.red.italic('Failed to update session data'));
                }
            } else {
                console.log(chalk.yellow.dim('Cancelled - no song deleted'));
            }
        }).catch(error => {
            console.log(chalk.red.italic('Failed to confirm song deletion'));
            console.log(chalk.red.italic.underline(error));
        })
    }).catch(error => {
        console.log(chalk.red.italic('Failed to select song'));
        console.log(chalk.red.italic.underline(error));
    })            
}

// Open the main menu
async function openMainMenu() {
    // Use inquirer to generate a selection menu for which action to take
    // Then call the appropriate function
    inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Select an action',
            choices: [
                {
                    name: 'Cancel',
                    value: 0
                },
                {
                    name: 'Edit Timestamps',
                    value: 1
                },
                {
                    name: 'Delete Song',
                    value: 2
                },
                {
                    name: 'Export Chapters to File',
                    value: 3
                },
                {
                    name: 'Export Chapters & Exit Program',
                    value: 4
                },
                {
                    name: 'Exit Program',
                    value: -1
                }
            ]
        }
    ]).then(async answer => {
        switch (answer.action) {
            case 0:
                console.log(chalk.yellow.dim('Cancelled - no action taken'));
                break;
            case 1:
                await selectNewTimestampIndex();
                break;
            case 2:
                await deleteSongFromSession();
                break;
            case 3:
                await exportYouTubeTrackList();
                break;
            case 4:
                await exportYouTubeTrackList();
                await backupSessions(true);
                process.exit(0);
            case -1:
                await backupSessions(true);
                console.log(chalk.yellow.dim('Exiting'));
                process.exit(0);
            default:
                console.log(chalk.red.italic('Invalid action'));
                break;
        }
    }).catch(error => {
        console.log(chalk.red.italic('Failed to select action'));
        console.log(chalk.red.italic.underline(error));
    })
}


export { addTimeStamp, startNewSession, markLastPlayedSong, updateSessionOnSongChange, openMainMenu } 