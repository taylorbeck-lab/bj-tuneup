/**
 * Features that are built but not shipped. "Ask the coach" is a chat that needs each player's own
 * API key: too much to ask of someone trying the app, so it's left out of the build unless
 * VITE_AI_COACH=1 is set when building.
 */
export const AI_COACH: boolean = __AI_COACH__;
