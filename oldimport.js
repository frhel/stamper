import mongoose from 'mongoose';
import settings from './settings.json';


await mongoose.connect(`mongodb+srv://${settings.db_user}:${settings.db_pwd}@${db_cluster_path}`);

const schema = mongoose.Schema;
const ObjectId = schema.ObjectId;

// remove quotation marks from the following object
const SessionSchema = new schema({
    session_id: {
        type: ObjectId,
        required: true,
        unique: true,
        default: mongoose.Types.ObjectId(),
    },
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
            type: ObjectId,
            required: true,
            unique: true,
            default: mongoose.Types.ObjectId(),
        },
        timestamps: [{
            current: {
                type: Date,
                required: true,
                default: Date.now(),
            },
            previous: [{
                type: Date,
                required: false,
                default: null,
            }],
        }],
    }]
});