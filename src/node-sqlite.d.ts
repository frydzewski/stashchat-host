// Ambient types for Node's built-in `node:sqlite` (editor convenience; Node 24
// runs this directly via type-stripping, no typecheck needed at runtime).
declare module "node:sqlite" {
  type BindValue = string | number | bigint | null | Uint8Array;
  interface StatementSync {
    run(namedParams: Record<string, BindValue>): { changes: number; lastInsertRowid: number | bigint };
    run(...params: BindValue[]): { changes: number; lastInsertRowid: number | bigint };
    get(namedParams: Record<string, BindValue>): unknown;
    get(...params: BindValue[]): unknown;
    all(namedParams: Record<string, BindValue>): unknown[];
    all(...params: BindValue[]): unknown[];
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
