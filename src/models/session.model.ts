import fs from 'fs';

import chalk from 'chalk';
import 'dotenv/config'

import { Session } from './session.mongo.js';
import type { ISession } from '../interfaces/ISession';

chalk.level = 1;

// Backup all sessions from database to a timestamped file on every startup if the file doesn't exist
async function backupSessions(force: boolean = false) {
    const sessions: ISession[] = await Session.find();
    const date = new Date();
    const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const fileName = `${process.env['DB_BACKUP_FOLDER']}session_backup-${dateString}.json`;
    const data = JSON.stringify(sessions);
    if (!fs.existsSync(fileName) || force) {
        await fs
            .promises
            .writeFile(fileName, data, 'utf8')
            .then(() => {
                console.log(chalk.greenBright.italic.dim(`Successfully backed up sessions to ${fileName}`));
            })
            .catch((err) => {
                console.log(chalk.redBright.italic.dim(`Error backing up sessions to ${fileName}`));
                console.log(err);
            });
    } else {
        console.log(chalk.yellowBright.italic.dim(`Backup file ${fileName} already exists`));
    }
}

// Does some initial setup for the session at the start of the program after the database has been connected
// Backs up the sessions and then cleans them up
// If there is no session in the database, it creates a new one
// This function is called in app.ts
async function initSession() {
    // only backup sessions if we're not in a test environment
    if (process.env['DB_NAME'] !== 'test') {
        await backupSessions();
    }

    // Clean up any sessions that don't have any songs saved to them
    // We do this AFTER backing up the sessions to avoid losing data
    // Would rather back up the useless sessions than lose useful ones if something goes wrong
    await cleanSessions();
    let latestSession = await getSessionData();
    
    // variable with 12 hours in milliseconds
    const twelveHours = 12 * 60 * 60 * 1000;
    if (!latestSession || Date.now() - latestSession.startTime.getTime() > twelveHours) {
        console.log(chalk.yellow.bold.underline(' Old session or no session found, creating new one '));
        latestSession = await createNewSession();
    } else {
        console.log(chalk.bgGreenBright.bold.underline(' Session found, loading data '));
        // Doesn't actually return anything, just sets the global session start time to match the latest session start time
        // For other functions to use as a reference
        global.SESSION_START = latestSession.startTime; 
    }
    console.log(chalk.white.dim('Loaded session: ') + chalk.magenta.italic(latestSession?.startTime));
}


// Loads the latest session from the database and returns it as an object
const getSessionData = async (): Promise<ISession> => {
    let session = await Session.findOne().sort({ startTime: -1 }).lean<ISession>();
    if (session == null) {
        console.log(chalk.redBright.italic('No session found in database'));
    }
    return session;
}

// Saves the session data to the database
// Returns true if successful, false if not
async function saveSessionData(session: ISession) {
    try {
        await Session.updateOne(
            {startTime: session.startTime}, // find the session with the same start time
            session, // update the session with the new data
            {upsert: true} // make sure to update the session if it already exists
        );
    } catch (err) {
        console.log(chalk.redBright.italic('Error while saving session to database'));
        console.error(err);
        return false;
    }
    // console.log(chalk.greenBright.italic('Successfully saved session to database'));
    return true;    
}

// Creates a new session and returns it as an object
// Default the startTime parameter to the SESSION_START global variable
// So that we can overwrite the startTime if we want to
// But also call it without any parameters to use the global variable as default
async function createNewSession(startTime = global.SESSION_START) {
    const session = new Session({
        startTime: startTime, // global.SESSION_START is a global variable
        yt_id: '',
        songs: []
    });
    if (await saveSessionData(session)) {
        console.log(chalk.magenta.bold('New session created for session: ') + chalk.white.underline(session.startTime));
    } else if (session == null) {
        console.log(chalk.redBright.italic('Error creating new session'));
    }
    return session;
}

// Cleans up any sessions that don't have any songs saved to them
// We do this AFTER backing up the sessions to avoid losing data
async function cleanSessions() {
    if (process.env['DB_NAME'] !== 'test') {
        return;
    }
    try {
        const sessions: ISession[] = await Session.find().sort({ startTime: -1 });
        if (sessions.length > 1) {
            let counter = 0;
            console.log(chalk.yellow.bold('Checking if any sessions can be deleted')); 
            for (let i = 1; i < sessions.length; i++) {               
                if (sessions[i] != null) {
                    if (sessions[i]!.songs.length === 0) {
                        await Session.findOneAndDelete( { startTime: sessions[i]!.startTime } );
                        console.log(chalk.red.bold.italic('Deleted session: ') + chalk.white.underline.dim.italic(sessions[i]!.startTime));
                        counter++;
                    }
                }
            }
            if (counter === 0) {
                console.log(chalk.greenBright.bold('No sessions found that can be deleted'));
            } else {
                console.log(chalk.red.bold(`Deleted a total of ${counter} sessions`));
            }
        }
    } catch (error) {
        console.error(chalk.red.underline.bold('Error while cleaning sessions: ', error));
    }
}

export { createNewSession, saveSessionData, initSession, getSessionData, backupSessions };