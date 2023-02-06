import mongoose from 'mongoose';
import type { ISession } from '../interfaces/ISession';

const Schema = mongoose.Schema;

// remove quotation marks from the following object
const SessionSchema = new Schema({
    startTime: {
        type: Date,
        required: true,
        default: Date.now(),
        index: true,
    },
    yt_id: {
        type: String,
        required: true,
        default: '',
    },
    songs: [{
        artist: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        comment: {
            type: String,
            required: true,
            default: '',
        },
        modifier: {
            type: String,
            required: true,
            default: '',
        },
        isPlayed: {
            type: Boolean,
            required: true,
            default: false,
        },
        request_id: {
            type: Number,
            required: true,
        },
        timestampIndex: {
            type: Number,
            required: true,
        },

        timestamps: [{
            type: String,
            required: true,
        }],
    }]
});

const Session = mongoose.model<ISession>('Session', SessionSchema);

export { Session };