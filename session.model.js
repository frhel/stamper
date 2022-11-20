import fs from 'fs';

import chalk from 'chalk';

import { Session } from './session.mongo.js';

chalk.level = 1;

// Backup all sessions from database to a timestamped file on every startup if the file doesn't exist
async function backupSessions(force = false) {
    const sessions = await Session.find();
    const date = new Date();
    const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const fileName = `./backups/session_backup-${dateString}.json`;
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
} backupSessions();

async function initSession() {
    let latestSession = await getSessionData();
    
    // variable with 12 hours in milliseconds
    const twelveHours = 12 * 60 * 60 * 1000;
    if (!latestSession || Date.now() - latestSession.startTime > twelveHours) {
        console.log(chalk.bgYellowBright.bold.underline(' Old session or no session found, creating new one '));
        latestSession = await createNewSession();
    } else {
        console.log(chalk.bgGreenBright.bold.underline(' Session found, loading data '));
        global.SESSION_START = latestSession.startTime; 
    }
    console.log(chalk.white.dim('Loaded session: ') + chalk.magenta.italic(latestSession.startTime));
}


// Loads the latest session from the database and returns it as an object
async function getSessionData() {
    try {
        let session = await Session.findOne().sort({ startTime: -1 });
        return session;
    } catch (error) {
        console.error('Error while loading session data: ', error);
        return null;
    }
}

// 
async function saveSessionData(session) {
    try {
        await Session.updateOne(
            {startTime: session.startTime},
            session,
            {upsert: true}
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
async function createNewSession(startTime = global.SESSION_START) {
    try {
        const session = new Session({
            startTime: startTime // global.SESSION_START is a global variable
        });
        await session.save();
        console.log(chalk.magenta.bold('New session created for session: ') + chalk.white.underline(session.startTime));
        // cleanSessions();
        return session;
    } catch (error) {
        console.error(chalk.red.underline.bold('Error while creating new session: ', error));
        return null;
    }
}

// Cleans up sessions that have no entries except the latest one
async function cleanSessions() {
    try {
        const sessions = await Session.find().sort({ startTime: -1 });
        if (sessions.length > 1) {
            let counter = 0;
            console.log(chalk.yellow.bold('Checking if any sessions can be deleted')); 
            for (let i = 1; i < sessions.length; i++) {               
                if (sessions[i].songs.length === 0) {
                    await Session.findByIdAndDelete(sessions[i]._id);
                    console.log(chalk.red.bold.italic('Deleted session: ') + chalk.white.underline.dim.italic(sessions[i].startTime));
                    counter++;
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