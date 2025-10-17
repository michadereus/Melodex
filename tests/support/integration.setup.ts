// tests/support/integration.setup.ts
// Integration (node) setup. We pre-stub mongodb internals and the controller
// *before* the backend router is imported by any test.

import { vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

// Compute all paths at hoist time. Return only strings; no arrays/loops for hoisting.
const H = vi.hoisted(() => {
  const path = require('path');
  const { fileURLToPath } = require('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const ROOT    = path.resolve(__dirname, '..', '..');
  const BACKEND = path.resolve(ROOT, 'melodex-back-end');

  // mongodb/lib locations (backend-local & root-level)
  const BACKEND_MONGO_LIB = path.resolve(BACKEND, 'node_modules', 'mongodb', 'lib');
  const ROOT_MONGO_LIB    = path.resolve(ROOT,    'node_modules', 'mongodb', 'lib');

  // Deep file that blows up inside mongodb/lib/collection.js
  const MONGO_UPDATE_ID            = 'mongodb/lib/operations/search_indexes/update';
  const MONGO_UPDATE_ID_JS         = 'mongodb/lib/operations/search_indexes/update.js';
  const MONGO_UPDATE_ABS_BACKEND   = path.resolve(BACKEND_MONGO_LIB, 'operations', 'search_indexes', 'update');
  const MONGO_UPDATE_JS_ABS_BACKEND= path.resolve(BACKEND_MONGO_LIB, 'operations', 'search_indexes', 'update.js');
  const MONGO_UPDATE_ABS_ROOT      = path.resolve(ROOT_MONGO_LIB,    'operations', 'search_indexes', 'update');
  const MONGO_UPDATE_JS_ABS_ROOT   = path.resolve(ROOT_MONGO_LIB,    'operations', 'search_indexes', 'update.js');

  // mongodb entry points (both absolute and bare)
  const MONGO_PKG_BACKEND          = path.resolve(BACKEND, 'node_modules', 'mongodb');
  const MONGO_INDEX_BACKEND        = path.resolve(BACKEND, 'node_modules', 'mongodb', 'lib', 'index');
  const MONGO_INDEX_JS_BACKEND     = path.resolve(BACKEND, 'node_modules', 'mongodb', 'lib', 'index.js');
  const MONGO_PKG_ROOT             = path.resolve(ROOT,    'node_modules', 'mongodb');
  const MONGO_INDEX_ROOT           = path.resolve(ROOT,    'node_modules', 'mongodb', 'lib', 'index');
  const MONGO_INDEX_JS_ROOT        = path.resolve(ROOT,    'node_modules', 'mongodb', 'lib', 'index.js');
  const MONGO_BARE_ID              = 'mongodb';
  const MONGO_BARE_INDEX           = 'mongodb/lib/index';
  const MONGO_BARE_INDEX_JS        = 'mongodb/lib/index.js';

  // Controller absolute paths (so router never loads the real one)
  const CONTROLLER_ABS             = path.resolve(BACKEND, 'controllers', 'UserSongsController');
  const CONTROLLER_ABS_JS          = `${CONTROLLER_ABS}.js`;

  return {
    MONGO_UPDATE_ID,
    MONGO_UPDATE_ID_JS,
    MONGO_UPDATE_ABS_BACKEND,
    MONGO_UPDATE_JS_ABS_BACKEND,
    MONGO_UPDATE_ABS_ROOT,
    MONGO_UPDATE_JS_ABS_ROOT,

    MONGO_PKG_BACKEND,
    MONGO_INDEX_BACKEND,
    MONGO_INDEX_JS_BACKEND,
    MONGO_PKG_ROOT,
    MONGO_INDEX_ROOT,
    MONGO_INDEX_JS_ROOT,
    MONGO_BARE_ID,
    MONGO_BARE_INDEX,
    MONGO_BARE_INDEX_JS,

    CONTROLLER_ABS,
    CONTROLLER_ABS_JS,
  };
});

// ---- minimal fakes ----
function mongoStubFactory() {
  class FakeCollection {
    find()       { return { toArray: async () => [] }; }
    findOne()    { return Promise.resolve(null); }
    insertOne()  { return Promise.resolve({ insertedId: '1' }); }
    updateOne()  { return Promise.resolve({ matchedCount: 0, modifiedCount: 0 }); }
    deleteOne()  { return Promise.resolve({ deletedCount: 0 }); }
    deleteMany() { return Promise.resolve({ deletedCount: 0 }); }
    aggregate()  { return { toArray: async () => [] }; }
    initializeUnorderedBulkOp() { return { length: 0, execute: async () => ({ ok: 1 }) }; }
    findOneAndUpdate() { return Promise.resolve({ value: null }); }
    watch()      { return { on: () => {}, close: () => {} }; }
  }
  class FakeDb {
    collection() { return new FakeCollection(); }
    command()    { return Promise.resolve({ ok: 1 }); }
  }
  class FakeClient {
    async connect() { return this; }
    db() { return new FakeDb(); }
    close() { return Promise.resolve(); }
  }
  const mod = { MongoClient: FakeClient, ObjectId: class {} };
  return { ...mod, default: mod };
}

function makeControllerMock() {
  const noop = (_req: unknown, _res: unknown, next?: unknown) => { if (typeof next === 'function') next(); };
  const proxy = new Proxy({}, { get: () => noop });
  return { __esModule: true, default: proxy, ...proxy };
}

/* ---------------------------------------------------------
   1) Stub the deep Mongo driver file (multiple ids/paths)
   --------------------------------------------------------- */
vi.mock(H.MONGO_UPDATE_ID,          () => ({}));
vi.mock(H.MONGO_UPDATE_ID_JS,       () => ({}));
vi.mock(H.MONGO_UPDATE_ABS_BACKEND, () => ({}));
vi.mock(H.MONGO_UPDATE_JS_ABS_BACKEND, () => ({}));
vi.mock(H.MONGO_UPDATE_ABS_ROOT,    () => ({}));
vi.mock(H.MONGO_UPDATE_JS_ABS_ROOT, () => ({}));

/* ---------------------------------------------------------
   2) Mock the mongodb package (absolute and bare ids)
   --------------------------------------------------------- */
vi.mock(H.MONGO_PKG_BACKEND,      mongoStubFactory);
vi.mock(H.MONGO_INDEX_BACKEND,    mongoStubFactory);
vi.mock(H.MONGO_INDEX_JS_BACKEND, mongoStubFactory);
vi.mock(H.MONGO_PKG_ROOT,         mongoStubFactory);
vi.mock(H.MONGO_INDEX_ROOT,       mongoStubFactory);
vi.mock(H.MONGO_INDEX_JS_ROOT,    mongoStubFactory);
vi.mock(H.MONGO_BARE_ID,          mongoStubFactory);
vi.mock(H.MONGO_BARE_INDEX,       mongoStubFactory);
vi.mock(H.MONGO_BARE_INDEX_JS,    mongoStubFactory);

/* ---------------------------------------------------------
   3) Session store & mongoose
   --------------------------------------------------------- */
vi.mock('connect-mongo', () => {
  const fake = { create: () => ({}) };
  return { default: fake, ...fake };
});

vi.mock('mongoose', () => ({
  default: {},
  connect: vi.fn().mockResolvedValue({}),
  connection: { on: vi.fn(), once: vi.fn(), close: vi.fn() },
  model: vi.fn(),
  Schema: class {},
  Types: { ObjectId: class {} },
}));

/* ---------------------------------------------------------
   4) Replace the UserSongsController by absolute path
   --------------------------------------------------------- */
vi.mock(H.CONTROLLER_ABS,    makeControllerMock);
vi.mock(H.CONTROLLER_ABS_JS, makeControllerMock);

// Done. Tests can safely require the backend router now.
