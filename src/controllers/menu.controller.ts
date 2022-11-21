import inquirer from 'inquirer';
import chalk from 'chalk';

import { getSessionData, saveSessionData, backupSessions } from '../models/session.model.js';
import { exportYouTubeTrackList } from './youtube.controller.js';
import type { ISong } from '../interfaces/ISong';


chalk.level = 1;

// Open a menu to allow the user to change the current song's to a different one
async function selectNewTimestampIndex() {
    
    let session = await getSessionData();
    if (session == null) {
        console.log(chalk.red.italic('Failed to get session data'));
        return;
    }
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
                    value: session!.songs.indexOf(song)
                }
            }).reverse())
        }
    ]).then(async answer => {
        if (answer.song === -1) {
            console.log(chalk.yellow.dim('Cancelled timestamp selection'));
            return openMainMenu();
        }
        const song: ISong = session!.songs[answer.song]!;
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
                return openMainMenu();
            }
            song.timestampIndex = answer.timestamp;
            session!.songs[answer.song] = song;
            if (await saveSessionData(session!)) {
                console.log(`Updated ${chalk.cyan.bold.italic(song.title)} by ${chalk.cyan.bold.italic(song.artist)} to ${chalk.magenta.bold.italic(song.timestamps[song.timestampIndex])}`);
            } else {
                console.log(chalk.red.italic('Failed to update session data'));
            }
            openMainMenu();
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
            return openMainMenu();
        }        
        const song = session.songs[answer.song]!; // Get the selected song from the session data
        inquirer.prompt([
            {
                type: 'list',
                name: 'confirm',
                message: `Are you sure you wish to delete ${chalk.red.bold.italic(song.title)} by ${chalk.red.bold.italic(song.artist)}?`,
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
            openMainMenu();
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
                    name: 'Exit Menu',
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
                    name: 'Export Chapters & Close Program',
                    value: 4
                },
                {
                    name: 'Close Program',
                    value: -1
                }
            ]
        }
    ]).then(async (answer: any) => {
        switch (answer.action) {
            case 0:
                console.log(chalk.yellow.dim('Exited menu'));
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

export { openMainMenu };