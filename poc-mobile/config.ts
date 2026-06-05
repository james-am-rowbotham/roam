// For simulator: localhost works. For a physical device, set EXPO_PUBLIC_API_HOST
// to your machine's LAN IP (e.g. 192.168.1.x).
const host = process.env.EXPO_PUBLIC_API_HOST ?? 'localhost'
export const API_BASE_URL = `http://${host}:3000`
