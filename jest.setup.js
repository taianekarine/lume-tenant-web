import '@testing-library/jest-dom';
import {
  ReadableStream,
  TextDecoderStream,
  TextEncoderStream,
  TransformStream,
  WritableStream,
} from 'node:stream/web';
import { TextDecoder, TextEncoder } from 'node:util';
import { deserialize, serialize } from 'node:v8';

globalThis.TextDecoder ??= TextDecoder;
globalThis.TextEncoder ??= TextEncoder;
globalThis.ReadableStream ??= ReadableStream;
globalThis.TextDecoderStream ??= TextDecoderStream;
globalThis.TextEncoderStream ??= TextEncoderStream;
globalThis.TransformStream ??= TransformStream;
globalThis.WritableStream ??= WritableStream;
globalThis.structuredClone ??= (value) => deserialize(serialize(value));

/* eslint-disable @typescript-eslint/no-require-imports -- load after the Web API polyfills above */
const {
  Headers: EdgeHeaders,
  Request: EdgeRequest,
  Response: EdgeResponse,
} = require('next/dist/compiled/@edge-runtime/primitives');
/* eslint-enable @typescript-eslint/no-require-imports */

globalThis.Headers ??= EdgeHeaders;
globalThis.Request ??= EdgeRequest;
globalThis.Response ??= EdgeResponse;

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
