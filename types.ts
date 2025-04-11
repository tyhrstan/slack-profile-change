export interface SlackResponse {
    ok: boolean;
    profile: {
        status_emoji?: string;
        status_text?: string;
        status_expiration?: number;
        avatar_hash: string;
    };
}