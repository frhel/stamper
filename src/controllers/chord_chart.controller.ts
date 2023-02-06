import open from 'open';

import type { ISong } from '../interfaces/ISong.js';

// Just so we don't open the same chart twice in a row
let last_opened = '';

function open_chord_chart(song: ISong) {
    if (song.comment === '') return;
    if (song.comment === last_opened) return;
    last_opened = song.comment;
    open(song.comment);
}

export { open_chord_chart }