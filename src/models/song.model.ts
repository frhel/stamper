import fetch from 'node-fetch';

import { updateSessionOnSongChange } from '../controllers/session.controller.js';
import type { ISong } from '../interfaces/ISong';

// https://api.streamersonglist.com/docs/ for endpoints.
const streamerId = 7325; // Numerical value of endpoint - Absolutely no clue where I found this to begin with
const songlistAPIUri = `https://api.streamersonglist.com`;
const songlistAPIQueueUri = `${songlistAPIUri}/v1/streamers/${streamerId}/queue`;
const songlistAPIHistoryUri = `${songlistAPIUri}/v1/streamers/${streamerId}/playHistory?period=stream`; // Only get entries from the current stream

let SL_SONG: ISong;

function getCurrentSong(): ISong {
    return SL_SONG;
}

function shapeSongData(): ISong {
    return {
        artist: '',
        title: '',
        modifier: '',
        isPlayed: false,
        request_id: 0,
        timestampIndex: 0,
        timestamps: []
    }
}

// Function to get the current song from the songlist queue
async function fetchCurrentSong(): Promise<ISong> {
    const songQueue = await fetchSongListData(songlistAPIQueueUri);
    // Check if there is actually a song in the queue
    let songData: ISong = shapeSongData();
    let entry = {};
    if (songQueue.list.length > 0) {
        // format the data for our own purposes
        entry = songQueue.list[0]; // Grab the first entry, which will be the current song
        songData = await processSongData(entry, songData); // Process the song data
    }
    return songData;
}

// Function to check if the current song has changed
async function checkIfSongUpdate() {
    const currentSong = await fetchCurrentSong();
    if (currentSong !== SL_SONG) {
        SL_SONG = currentSong;
        updateSessionOnSongChange();
    }
}

function processSongData(entry: any, songData: ISong): ISong {
    // Check whether the nonlistSong is anything other than a string.
    // If it is, we can handle the current entry as a regular song from the songlist
    // otherwise it will be handled as a manually added entry that doesn't exist in the database
    let tempData: any;
    if (Object.keys(entry).length) {
        if (typeof entry.nonlistSong !== "string") {
            tempData = handleSongListEntry(entry.song);
            tempData.modifier = handleSongModifiers(entry, true)
        } else {
            tempData = handleNonListEntry(entry);
            tempData.modifier = handleSongModifiers(entry, false);
        }

        songData = {
            artist: tempData.artist.trim() || '',
            title: tempData.title.trim() || '',
            modifier: tempData.modifier || '',
            isPlayed: false,
            request_id: entry.id || '',
            timestampIndex: 0,
            timestamps: []
        }
    }
    return songData;
}

function handleSongListEntry(song: any) {
    return {
        artist: song.artist,
        title: song.title,
    };
}

function handleNonListEntry(song: any) {
    // Split on " - " as per sepecification "{artist} - {songtitle}"
    let retObj = {};
    let splitStr = [];

    // Only handle the nonlistSong as an artist / title combo if the split string exists
    if (song.nonlistSong.includes(" - ")) {
        splitStr = song.nonlistSong.split(" - ");
    }

    // Set the return object depending on whether we split the string or not.
    // If the string wasn't split, the request was malformed by mod and we add the whole thing to title
    if (splitStr.length > 0) {
        retObj = {
            artist: splitStr[0],
            title: splitStr[1],
        }
    } else {
        retObj = {
            artist: '',
            title: song.nonlistSong,
        }
    }
    return retObj;
}

function handleSongModifiers(song: any, isListSong: any) {
    // The id of the "Original Song" attribute
    let originalSongAttributeId = 40118

    // nonlist songs can't have attribute id's but list songs can
    if (isListSong) {
        if (song.song.attributeIds.includes(originalSongAttributeId)) {
            return "Original Song";
        }
    }

    // a song will only have one modifier in note so we return on the first one we encounter
    if (!song.note) {
        return '';
    } else {
        switch (song.note.toLowerCase()) {
            case 'lav' || 'like a version' || 'likeaversion':
                return 'Like A Version';
            case 'improv' || 'imp' || 'improvised' || 'improvised song':
                return 'Improvised Song';
            case 'll' || 'livelearn' || 'live learn':
                return 'Live Learn';
            case 'original' || 'orig' || 'original song':
                return 'Original Song';
            default:    // Should never be reached
                return '';
        }
    }
}

// Fetch the current songlist queue and return it as an object
function fetchSongListData(URI: string) {
    let songData: any = fetch(URI, { method: "Get" })
            .then(res => res.json())
            .catch(err => console.log(err));
    if (songData != null) {
        return songData;
    }
}

// Function to make history data look like queue data so we can reuse the processSongData function
function convertHistoryToSongListData(song: any) {
    if (song.song) {
        song.song.attributeIds = [];
    }
    return song;
}

// Fetch the played song history and return it as an object
async function getLastPlayedSong(): Promise<ISong> {
    const songHistory = await fetchSongListData(songlistAPIHistoryUri);
    let tempData: any = {};
    let songData: ISong = shapeSongData();
    if (songHistory.items.length > 0) {
        tempData = convertHistoryToSongListData(songHistory.items[0]);
        songData = processSongData(tempData, songData); // Process the song data
    }
    return songData;
}

export { getCurrentSong, getLastPlayedSong, checkIfSongUpdate }