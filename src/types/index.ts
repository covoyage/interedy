export interface RedisConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface TreeNode {
  key: string;
  label: string;
  fullPath: string;
  children?: TreeNode[];
  isLeaf?: boolean;
  type?: RedisKeyType;
  expanded?: boolean;
  loaded?: boolean;
}

export type RedisKeyType = "string" | "hash" | "list" | "set" | "zset" | "stream";

// Backend returns tagged enum: { type: "string", value: "..." } | { type: "hash", value: [...] }
export type KeyDetailValue =
  | { type: "string"; value: string }
  | { type: "hash"; value: HashValue[] }
  | { type: "list"; value: string[] }
  | { type: "set"; value: string[] }
  | { type: "zset"; value: ZSetValue[] }
  | { type: "stream"; value: string };

export interface KeyDetail {
  key: string;
  type: string;
  ttl: number;
  value: KeyDetailValue;
}

export interface HashValue {
  field: string;
  value: string;
}

export interface ZSetValue {
  member: string;
  score: number;
}

export interface CommandResult {
  success: boolean;
  data?: string;
  error?: string;
}
