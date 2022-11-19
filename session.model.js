import fs from 'fs';

import mongoose from 'mongoose';
import chalk from 'chalk';

import { Session } from './session.mongo.js';

chalk.level = 1;

// Backup all sessions from database to a timestamped file every time 
async function backupSessions() {
    const sessions = await Session.find();
    const date = new Date();
    const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
    const fileName = `./backups/sessiondata -${dateString}.json`;
    const data = JSON.stringify(sessions, null, 4);
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
} backupSessions();

// Loads the latest session from the database and returns it as an object
async function loadSessionData(startTime) {
    // find latest session with mongoose and return it
    // if there are no sessions yet, create a new one
    
    // variable with 12 hours in milliseconds
    const twelveHours = 12 * 60 * 60 * 1000;
    try {
        const latestSession = await Session.findOne().sort({ startTime: -1 });        
        if (!latestSession || Date.now() - latestSession.startTime > twelveHours) {
            console.log(chalk.bgYellowBright.bold.underline('Old session or no session found, creating new one'));
            const newSession = await createNewSession(startTime);
            return newSession;
        }
        console.log(chalk.magenta.bold('Session restored from database for session: ') + chalk.white.underline(latestSession.startTime));
        return latestSession;
    } catch (error) {
        console.error('Error while loading session data: ', error);
        return null;
    }
}

// 
async function saveSessionData(sessionObj) {    
    // upsert sessionObj as Session into database
    try {
        await Session.updateOne(
            {startTime: sessionObj.startTime},
            sessionObj,
            {upsert: true}
        );
    } catch (err) {
        console.log(chalk.redBright.italic('Error while saving session to database'));
        console.error(err);
        return false;
    }
    return true;    
}

// Creates a new session and returns it as an object
async function createNewSession(startTime) {
    try {
        const session = new Session({
            startTime: startTime
        });
        await session.save();
        console.log(chalk.magenta.bold('New session created for session: ') + chalk.white.underline(session.startTime));
        cleanSessions();
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
            console.log(chalk.yellow.bold('Cleaning up garbage sessions'));
            for (let i = 1; i < sessions.length; i++) {               
                if (sessions[i].songs.length === 0) {
                    await Session.findByIdAndDelete(sessions[i]._id);
                    console.log(chalk.red.bold.italic('Deleted session: ') + chalk.white.underline.dim.italic(sessions[i].startTime));
                }
            }
        }
    } catch (error) {
        console.error(chalk.red.underline.bold('Error while cleaning sessions: ', error));
    }
}
export { loadSessionData, createNewSession, saveSessionData, };