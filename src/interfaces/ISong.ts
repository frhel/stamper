export interface ISong {
    artist: string;
    title: string;
    comment: string;
    modifier: string;
    isPlayed: boolean;
    request_id: number;
    timestampIndex: number;
    timestamps: string[];
}