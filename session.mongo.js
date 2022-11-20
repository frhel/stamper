import mongoose from 'mongoose';

const schema = mongoose.Schema;

// remove quotation marks from the following object
const SessionSchema = new schema({
    startTime: {
        type: Date,
        required: true,
        default: Date.now(),
        index: true,
    },
    yt_id: {
        type: String,
        required: false,
        default: null,
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
        modifier: {
            type: String,
            required: false,
            default: null,
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

const Session = mongoose.model('Session', SessionSchema);

export { Session };