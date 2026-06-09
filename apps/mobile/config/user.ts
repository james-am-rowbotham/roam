// Interim current-user identity.
//
// Auth isn't wired yet (Supabase Auth is planned — see PROJECT GUIDE §3/§15).
// Until then the app and API agree on a fixed dev user id so journeys can be
// created and listed. Replace every read of CURRENT_USER_ID with the session
// user once auth lands.
export const CURRENT_USER_ID = 'dev-user';
