import fetch from 'node-fetch';

// https://api.streamersonglist.com/docs/ for endpoints. 
const streamerId = 7325; // Numerical value of endpoint - Absolutely no clue where I found this to begin with
const songlistAPIUri = `https://api.streamersonglist.com`;
const songlistAPIQueueUri = `${songlistAPIUri}/v1/streamers/${streamerId}/queue`;
const songlistAPIHistoryUri = `${songlistAPIUri}/v1/streamers/${streamerId}/playHistory?period=stream`; // Only get entries from the current stream

async function updateCurrentSong() {
    let currentSong = {} // Make a new object for the current song

    const songQueue = await fetchSongListData(songlistAPIQueueUri);

    // Check if there is actually a song in the queue
    if (songQueue.list.length > 0) {
        const entry = songQueue.list[0]; // Grab the first entry, which will be the current song

        // Check whether the nonlistSong is anything other than a string.
        // If it is, we can handle the current entry as a regular song from the songlist
        // otherwise it will be handled as a manually added entry that doesn't exist in the database
        if (typeof entry.nonlistSong !== "string") {
            currentSong = handleSongListEntry(entry.song);
        } else {
            currentSong = handleNonListEntry(entry);
        }

        // Set the rest of the attributes that don't rely on the song being from the songlist or not
        currentSong.played = false; // default
        currentSong.id = entry.id;
        //console.log(entry);
        //console.log(currentSong);
    }
    return currentSong;
}

function handleSongListEntry(song) {
    return {
        artist: song.artist,
        title: song.title,
        modifier: handleSongModifiers(song, true)
    };
}

function handleNonListEntry(song) {
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
    retObj.modifier = handleSongModifiers(song, false);
    return retObj;
}

function handleSongModifiers(song, isListSong) {
    // lav: Like A Version
    // improv: Improvised Song with lyrics by dippy
    // ll: Live Learn
    let modifierList = ['lav', 'improv', 'll'];
    // The id of the "Original Song" attribute
    let originalSongAttributeId = 40118

    // nonlist songs can't have attribute id's but list songs can
    if (isListSong) {
        if (song.attributeIds.includes(originalSongAttributeId)) {
            return "Original Song";
        }
    }

    // a song will only have one modifier in note so we return on the first one we encounter
    if (!modifierList.includes(song.note)) {
        return '';
    } else {
        if (song.note === 'lav') {
            return "Like A Version";
        } else if (song.note === "improv") {
            return "Improvised song with lyrics by dip";
        } else {
            return "Live Learn";
        }
    }
}

function fetchSongListData(URI) {
    try {
        return fetch(URI, { method: "Get" })
            .then(res => res.json());
    } catch(err) {
        console.log(err);
        return { error: err };
    }
}

async function getSongHistory() {
    const songHistory = await fetchSongListData(songlistAPIHistoryUri);
}

export { updateCurrentSong, getSongHistory }