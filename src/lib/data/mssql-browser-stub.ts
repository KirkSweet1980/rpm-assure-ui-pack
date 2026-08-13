/**
 * Browser stub for `mssql` — SQL only runs on the server.
 * Vite resolves `mssql` → this file for client bundles so Node drivers never ship.
 */
const err = () => {
  throw new Error("mssql is server-only");
};

const stub: Record<string, unknown> = new Proxy(
  {
    default: {},
    connect: err,
    ConnectionPool: function ConnectionPool() {
      return { connect: err, request: err, close: err };
    },
    Request: function Request() {
      return { query: err, input: () => ({}) };
    },
    Transaction: function Transaction() {
      return { begin: err, commit: err, rollback: err };
    },
    NVarChar: () => ({}),
    Int: () => ({}),
    DateTime2: () => ({}),
    Bit: () => ({}),
    Decimal: () => ({}),
    VarChar: () => ({}),
    UniqueIdentifier: () => ({}),
    MAX: 0,
  },
  {
    get(target, prop) {
      if (typeof prop === "string" && prop in target) {
        return (target as Record<string, unknown>)[prop];
      }
      return err;
    },
  },
);

export default stub;
export const connect = err;
export const ConnectionPool = stub.ConnectionPool;
export const Request = stub.Request;
export const Transaction = stub.Transaction;
