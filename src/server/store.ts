import { PGlite, type Transaction } from "@electric-sql/pglite";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// PGlite owns a single local PostgreSQL instance. Never share this data directory
// between processes. The deployment boundary is documented in DEVELOPMENT.md.
const globals=globalThis as typeof globalThis & { saycartDB?:Promise<PGlite> };
export async function database() {
  globals.saycartDB ??= (async()=>{
    const dir=process.env.DATA_DIR || resolve(".local-data/postgres");
    if(!dir.startsWith("memory://")) await mkdir(dir,{recursive:true,mode:0o700});
    const db=await PGlite.create(dir);
    await db.exec(`CREATE TABLE IF NOT EXISTS documents (
      owner_id TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL,
      payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(owner_id,kind,id)
    );`);
    return db;
  })();
  return globals.saycartDB;
}
export class StoreTx {
  constructor(private tx:Transaction) {}
  async get<T>(owner:string,kind:string,id:string):Promise<T|null> {
    const result=await this.tx.query<{payload:T}>("SELECT payload FROM documents WHERE owner_id=$1 AND kind=$2 AND id=$3",[owner,kind,id]);
    return result.rows[0]?.payload ?? null;
  }
  async put<T>(owner:string,kind:string,id:string,value:T) {
    await this.tx.query("INSERT INTO documents(owner_id,kind,id,payload) VALUES($1,$2,$3,$4) ON CONFLICT(owner_id,kind,id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()",[owner,kind,id,JSON.stringify(value)]);
  }
  async remove(owner:string,kind:string,id:string) {
    await this.tx.query("DELETE FROM documents WHERE owner_id=$1 AND kind=$2 AND id=$3",[owner,kind,id]);
  }
}
export async function transaction<T>(fn:(tx:StoreTx)=>Promise<T>):Promise<T> {
  return (await database()).transaction(tx=>fn(new StoreTx(tx)));
}
export async function read<T>(owner:string,kind:string,id:string):Promise<T|null> {
  // A single SELECT already has statement-level consistency; reserve explicit
  // transactions for read/modify/write and multi-record snapshots.
  const result=await (await database()).query<{payload:T}>("SELECT payload FROM documents WHERE owner_id=$1 AND kind=$2 AND id=$3",[owner,kind,id]);
  return result.rows[0]?.payload??null;
}
export async function write<T>(owner:string,kind:string,id:string,value:T) {return transaction(tx=>tx.put(owner,kind,id,value));}
