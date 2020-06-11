
const NTPTS = require('ntp-time-sync');

const timeSync = NTPTS.default.getInstance();

export interface NTPTime {
    now: string;
    offest: number;
}

export class NTPApi {
    static async getTime() {
        return timeSync.getTime();
    }
}