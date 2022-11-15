import mongoose from 'mongoose';
import chalk from 'chalk';

import { Session } from './session.mongo.js';

chalk.level = 1;

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

// function that deletes all sessions with empty entries except the latest one
async function cleanSessions() {
    try {
        const sessions = await Session.find().sort({ startTime: -1 });
        if (sessions.length > 1) {
            console.log(chalk.yellow.bold('Cleaning up garbage sessions'));
            for (let i = 1; i < sessions.length; i++) {                
                console.log(chalk.red.bold.italic('Deleted session: ') + chalk.white.underline.dim.italic(sessions[i].startTime));
                await Session.findByIdAndDelete(sessions[i]._id);
            }
        }
    } catch (error) {
        console.error(chalk.red.underline.bold('Error while cleaning sessions: ', error));
    }
}

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

export { loadSessionData, createNewSession };