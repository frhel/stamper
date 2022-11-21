import type { ISong } from './ISong';

export interface ISession {
    startTime: Date;
    yt_id: string;
    songs: ISong[];
}