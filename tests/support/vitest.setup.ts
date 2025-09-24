import '@testing-library/jest-dom';
import 'whatwg-fetch'; // jsdom fetch

// For node env specs ONLY (integration)
// if (typeof window === 'undefined') {
//   const { fetch, Headers, Request, Response } = await import('undici');
//   Object.assign(globalThis, { fetch, Headers, Request, Response });
// }
