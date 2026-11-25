/**
 * API settings. Base URL ek hi jagah hai: ngrok URL badle to sirf yahin badalna hai.
 * Phone par `localhost` nahi chalta, isliye ngrok URL ya laptop ka IP use karo.
 */
export const API_BASE_URL = 'https://61f3-122-161-196-251.ngrok-free.app';

export const REQUEST_TIMEOUT_MS = 20_000;

/** ngrok ka browser-warning page API calls ko block na kare. */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'ngrok-skip-browser-warning': '1',
};
