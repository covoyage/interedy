import { invoke } from "@tauri-apps/api/core";
import type { RedisConnection, KeyDetail, RedisKeyType, CommandResult, HashValue, ZSetValue } from "../types";

// ─── Connections ───────────────────────────────────────────

export async function testConnection(host: string, port: number, password: string | null, db: number): Promise<string> {
  return invoke("test_connection", { host, port, password: password || null, db });
}

export async function saveConnection(conn: RedisConnection): Promise<void> {
  return invoke("save_connection", { conn });
}

export async function deleteConnection(id: string): Promise<void> {
  return invoke("delete_connection", { id });
}

export async function listConnections(): Promise<RedisConnection[]> {
  return invoke("list_connections");
}

// ─── Data Operations ──────────────────────────────────────

export async function connect(id: string): Promise<number> {
  return invoke("connect", { id });
}

export async function disconnect(id: string): Promise<void> {
  return invoke("disconnect", { id });
}

export async function switchDB(id: string, db: number): Promise<number> {
  return invoke("switch_db", { id, db });
}

export async function getKeys(id: string, pattern: string): Promise<string[]> {
  return invoke("get_keys", { id, pattern });
}

export async function getKeyType(id: string, key: string): Promise<RedisKeyType> {
  return invoke("get_key_type", { id, key });
}

export async function getKeyDetail(id: string, key: string): Promise<KeyDetail> {
  return invoke("get_key_detail", { id, key });
}

export async function setKeyValue(id: string, key: string, value: string): Promise<void> {
  return invoke("set_key_value", { id, key, value });
}

export async function deleteKey(id: string, key: string): Promise<void> {
  return invoke("delete_key", { id, key });
}

export async function setTTL(id: string, key: string, ttl: number): Promise<void> {
  return invoke("set_ttl", { id, key, ttl });
}

export async function getTreeChildren(id: string, prefix: string, separator: string): Promise<string[]> {
  return invoke("get_tree_children", { id, prefix, separator });
}

// ─── Hash Operations ──────────────────────────────────────

export async function getHashFields(id: string, key: string): Promise<HashValue[]> {
  return invoke("get_hash_fields", { id, key });
}

export async function setHashField(id: string, key: string, field: string, value: string): Promise<void> {
  return invoke("set_hash_field", { id, key, field, value });
}

export async function deleteHashField(id: string, key: string, field: string): Promise<void> {
  return invoke("delete_hash_field", { id, key, field });
}

// ─── List Operations ──────────────────────────────────────

export async function getListRange(id: string, key: string, start: number, stop: number): Promise<string[]> {
  return invoke("get_list_range", { id, key, start, stop });
}

export async function pushListItem(id: string, key: string, value: string, pushType: "left" | "right"): Promise<void> {
  return invoke("push_list_item", { id, key, value, pushType });
}

// ─── Set Operations ───────────────────────────────────────

export async function getSetMembers(id: string, key: string): Promise<string[]> {
  return invoke("get_set_members", { id, key });
}

export async function addSetMember(id: string, key: string, member: string): Promise<void> {
  return invoke("add_set_member", { id, key, member });
}

export async function deleteSetMember(id: string, key: string, member: string): Promise<void> {
  return invoke("delete_set_member", { id, key, member });
}

// ─── Sorted Set Operations ────────────────────────────────

export async function getZSetMembers(id: string, key: string): Promise<ZSetValue[]> {
  return invoke("get_zset_members", { id, key });
}

export async function addZSetMember(id: string, key: string, member: string, score: number): Promise<void> {
  return invoke("add_zset_member", { id, key, member, score });
}

export async function deleteZSetMember(id: string, key: string, member: string): Promise<void> {
  return invoke("delete_zset_member", { id, key, member });
}

// ─── Command Execution ────────────────────────────────────

export async function executeCommand(id: string, command: string): Promise<CommandResult> {
  return invoke("execute_command", { id, command });
}

// ─── DB Operations ────────────────────────────────────────

export async function getDBSize(id: string): Promise<number> {
  return invoke("get_db_size", { id });
}

export async function getDBInfo(id: string, section?: string): Promise<string> {
  return invoke("get_db_info", { id, section: section || "default" });
}
