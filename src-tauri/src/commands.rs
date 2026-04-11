use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

// ─── Types ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub password: Option<String>,
    pub db: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value", rename_all = "lowercase")]
pub enum KeyDetailValue {
    String(String),
    Hash(Vec<HashValue>),
    List(Vec<String>),
    Set(Vec<String>),
    Zset(Vec<ZSetValue>),
    Stream(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HashValue {
    pub field: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZSetValue {
    pub member: String,
    pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyDetail {
    pub key: String,
    #[serde(rename = "type")]
    pub key_type: String,
    pub ttl: i64,
    pub value: KeyDetailValue,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub data: Option<String>,
    pub error: Option<String>,
}

// ─── App State ─────────────────────────────────────────────

pub struct AppState {
    pub connections: Mutex<Vec<RedisConnection>>,
    pub clients: Mutex<HashMap<String, (redis::Client, u8)>>,
    pub config_path: std::path::PathBuf,
}

impl AppState {
    pub fn new() -> Self {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("interedy");
        std::fs::create_dir_all(&config_dir).ok();
        let config_path = config_dir.join("connections.json");

        let connections: Vec<RedisConnection> = if config_path.exists() {
            let content = std::fs::read_to_string(&config_path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            vec![]
        };

        Self {
            connections: Mutex::new(connections),
            clients: Mutex::new(HashMap::new()),
            config_path,
        }
    }

    pub fn save_connections(&self) {
        let conns = self.connections.lock().unwrap();
        let json = serde_json::to_string_pretty(&*conns).unwrap_or_default();
        std::fs::write(&self.config_path, json).ok();
    }
}

// ─── Connection Management ────────────────────────────────

#[tauri::command]
pub fn save_connection(conn: RedisConnection, state: State<AppState>) -> Result<(), String> {
    let mut conns = state.connections.lock().unwrap();
    if let Some(existing) = conns.iter_mut().find(|c| c.id == conn.id) {
        *existing = conn;
    } else {
        conns.push(conn);
    }
    drop(conns);
    state.save_connections();
    Ok(())
}

#[tauri::command]
pub fn delete_connection(id: String, state: State<AppState>) -> Result<(), String> {
    let mut conns = state.connections.lock().unwrap();
    conns.retain(|c| c.id != id);
    drop(conns);
    let mut clients = state.clients.lock().unwrap();
    clients.remove(&id);
    drop(clients);
    state.save_connections();
    Ok(())
}

#[tauri::command]
pub fn list_connections(state: State<AppState>) -> Result<Vec<RedisConnection>, String> {
    let conns = state.connections.lock().unwrap();
    Ok(conns.clone())
}

#[tauri::command]
pub fn connect(id: String, state: State<AppState>) -> Result<u8, String> {
    let conns = state.connections.lock().unwrap();
    let conn = conns.iter().find(|c| c.id == id).ok_or("连接不存在")?.clone();
    drop(conns);

    let url = build_redis_url(&conn)?;
    let client = redis::Client::open(url).map_err(|e| e.to_string())?;
    let mut c = client.get_connection().map_err(|e| format!("连接失败: {}", e))?;
    redis::cmd("PING")
        .query::<String>(&mut c)
        .map_err(|e| format!("PING 失败: {}", e))?;

    let mut clients = state.clients.lock().unwrap();
    clients.insert(id.clone(), (client, conn.db));
    Ok(conn.db)
}

#[tauri::command]
pub fn disconnect(id: String, state: State<AppState>) -> Result<(), String> {
    let mut clients = state.clients.lock().unwrap();
    clients.remove(&id);
    Ok(())
}

#[tauri::command]
pub fn switch_db(id: String, db: u8, state: State<AppState>) -> Result<u8, String> {
    let conns = state.connections.lock().unwrap();
    let conn = conns.iter().find(|c| c.id == id).ok_or("连接不存在")?.clone();
    drop(conns);

    // Build URL with the new db
    let mut new_conn = conn.clone();
    new_conn.db = db;
    let url = build_redis_url(&new_conn)?;
    let client = redis::Client::open(url).map_err(|e| e.to_string())?;
    let mut c = client.get_connection().map_err(|e| format!("连接 db{} 失败: {}", db, e))?;
    redis::cmd("PING")
        .query::<String>(&mut c)
        .map_err(|e| format!("PING 失败: {}", e))?;

    let mut clients = state.clients.lock().unwrap();
    clients.insert(id, (client, db));
    Ok(db)
}

// ─── Data Operations ──────────────────────────────────────

fn get_conn(clients: &HashMap<String, (redis::Client, u8)>, id: &str) -> Result<redis::Connection, String> {
    let (client, _) = clients.get(id).ok_or("未连接，请先连接 Redis")?;
    client.get_connection().map_err(|e| format!("获取连接失败: {}", e))
}

#[tauri::command]
pub fn get_keys(id: String, pattern: String, state: State<AppState>) -> Result<Vec<String>, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    let mut keys: Vec<String> = redis::cmd("KEYS")
        .arg(&pattern)
        .query(&mut conn)
        .map_err(|e| e.to_string())?;
    keys.sort();
    Ok(keys)
}

#[tauri::command]
pub fn get_key_type(id: String, key: String, state: State<AppState>) -> Result<String, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("TYPE")
        .arg(&key)
        .query::<String>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_key_detail(id: String, key: String, state: State<AppState>) -> Result<KeyDetail, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;

    let key_type: String = redis::cmd("TYPE")
        .arg(&key)
        .query::<String>(&mut conn)
        .map_err(|e| e.to_string())?;

    let ttl: i64 = redis::cmd("TTL")
        .arg(&key)
        .query(&mut conn)
        .map_err(|e| e.to_string())?;

    let value = match key_type.as_str() {
        "string" => {
            let val: String = redis::cmd("GET")
                .arg(&key)
                .query(&mut conn)
                .map_err(|e| e.to_string())?;
            KeyDetailValue::String(val)
        }
        "hash" => {
            let fields: Vec<(String, String)> = redis::cmd("HGETALL")
                .arg(&key)
                .query(&mut conn)
                .map_err(|e| e.to_string())?;
            KeyDetailValue::Hash(
                fields
                    .into_iter()
                    .map(|(field, value)| HashValue { field, value })
                    .collect(),
            )
        }
        "list" => {
            let items: Vec<String> = redis::cmd("LRANGE")
                .arg(&key)
                .arg(0i64)
                .arg(-1i64)
                .query(&mut conn)
                .map_err(|e| e.to_string())?;
            KeyDetailValue::List(items)
        }
        "set" => {
            let members: Vec<String> = redis::cmd("SMEMBERS")
                .arg(&key)
                .query(&mut conn)
                .map_err(|e| e.to_string())?;
            KeyDetailValue::Set(members)
        }
        "zset" => {
            let members: Vec<(String, f64)> = redis::cmd("ZRANGE")
                .arg(&key)
                .arg(0i64)
                .arg(-1i64)
                .arg("WITHSCORES")
                .query(&mut conn)
                .map_err(|e| e.to_string())?;
            KeyDetailValue::Zset(
                members
                    .into_iter()
                    .map(|(member, score)| ZSetValue { member, score })
                    .collect(),
            )
        }
        _ => KeyDetailValue::Stream("(unsupported type)".to_string()),
    };

    Ok(KeyDetail {
        key,
        key_type,
        ttl,
        value,
    })
}

#[tauri::command]
pub fn set_key_value(id: String, key: String, value: String, state: State<AppState>) -> Result<(), String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("SET")
        .arg(&key)
        .arg(&value)
        .query::<()>(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_key(id: String, key: String, state: State<AppState>) -> Result<(), String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("DEL")
        .arg(&key)
        .query::<()>(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn set_ttl(id: String, key: String, ttl: i64, state: State<AppState>) -> Result<(), String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    if ttl == -1 {
        redis::cmd("PERSIST")
            .arg(&key)
            .query::<()>(&mut conn)
            .map_err(|e| e.to_string())?;
    } else {
        redis::cmd("EXPIRE")
            .arg(&key)
            .arg(ttl)
            .query::<()>(&mut conn)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_tree_children(id: String, prefix: String, separator: String, state: State<AppState>) -> Result<Vec<String>, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    let pattern = format!("{}{}*", prefix, separator);
    let keys: Vec<String> = redis::cmd("KEYS")
        .arg(&pattern)
        .query(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(keys)
}

// ─── Hash Operations ──────────────────────────────────────

#[tauri::command]
pub fn get_hash_fields(id: String, key: String, state: State<AppState>) -> Result<Vec<HashValue>, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    let fields: Vec<(String, String)> = redis::cmd("HGETALL")
        .arg(&key)
        .query(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(fields
        .into_iter()
        .map(|(field, value)| HashValue { field, value })
        .collect())
}

#[tauri::command]
pub fn set_hash_field(id: String, key: String, field: String, value: String, state: State<AppState>) -> Result<(), String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("HSET")
        .arg(&key)
        .arg(&field)
        .arg(&value)
        .query::<()>(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_hash_field(id: String, key: String, field: String, state: State<AppState>) -> Result<(), String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("HDEL")
        .arg(&key)
        .arg(&field)
        .query::<()>(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── List Operations ──────────────────────────────────────

#[tauri::command]
pub fn get_list_range(id: String, key: String, start: i64, stop: i64, state: State<AppState>) -> Result<Vec<String>, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    let items: Vec<String> = redis::cmd("LRANGE")
        .arg(&key)
        .arg(start)
        .arg(stop)
        .query(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(items)
}

#[tauri::command]
pub fn push_list_item(id: String, key: String, value: String, push_type: String, state: State<AppState>) -> Result<(), String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    let cmd_name = if push_type == "left" { "LPUSH" } else { "RPUSH" };
    redis::cmd(cmd_name)
        .arg(&key)
        .arg(&value)
        .query::<()>(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Set Operations ───────────────────────────────────────

#[tauri::command]
pub fn get_set_members(id: String, key: String, state: State<AppState>) -> Result<Vec<String>, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    let members: Vec<String> = redis::cmd("SMEMBERS")
        .arg(&key)
        .query(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(members)
}

#[tauri::command]
pub fn add_set_member(id: String, key: String, member: String, state: State<AppState>) -> Result<(), String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("SADD")
        .arg(&key)
        .arg(&member)
        .query::<()>(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_set_member(id: String, key: String, member: String, state: State<AppState>) -> Result<(), String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("SREM")
        .arg(&key)
        .arg(&member)
        .query::<()>(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Sorted Set Operations ────────────────────────────────

#[tauri::command]
pub fn get_zset_members(id: String, key: String, state: State<AppState>) -> Result<Vec<ZSetValue>, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    let members: Vec<(String, f64)> = redis::cmd("ZRANGE")
        .arg(&key)
        .arg(0i64)
        .arg(-1i64)
        .arg("WITHSCORES")
        .query(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(members
        .into_iter()
        .map(|(member, score)| ZSetValue { member, score })
        .collect())
}

#[tauri::command]
pub fn add_zset_member(id: String, key: String, member: String, score: f64, state: State<AppState>) -> Result<(), String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("ZADD")
        .arg(&key)
        .arg(score)
        .arg(&member)
        .query::<()>(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_zset_member(id: String, key: String, member: String, state: State<AppState>) -> Result<(), String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("ZREM")
        .arg(&key)
        .arg(&member)
        .query::<()>(&mut conn)
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Command Execution ────────────────────────────────────

#[tauri::command]
pub fn execute_command(id: String, command: String, state: State<AppState>) -> Result<CommandResult, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;

    let parts: Vec<String> = shell_words::split(&command).map_err(|e| e.to_string())?;
    if parts.is_empty() {
        return Ok(CommandResult {
            success: false,
            data: None,
            error: Some("空命令".to_string()),
        });
    }

    let mut cmd = redis::cmd(&parts[0].to_uppercase());
    for arg in &parts[1..] {
        cmd.arg(arg);
    }

    match cmd.query::<redis::Value>(&mut conn) {
        Ok(value) => Ok(CommandResult {
            success: true,
            data: Some(format_redis_value(&value)),
            error: None,
        }),
        Err(e) => Ok(CommandResult {
            success: false,
            data: None,
            error: Some(e.to_string()),
        }),
    }
}

// ─── DB Info ──────────────────────────────────────────────

#[tauri::command]
pub fn get_db_size(id: String, state: State<AppState>) -> Result<u64, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("DBSIZE")
        .query::<u64>(&mut conn)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_db_info(id: String, section: String, state: State<AppState>) -> Result<String, String> {
    let clients = state.clients.lock().unwrap();
    let mut conn = get_conn(&clients, &id)?;
    redis::cmd("INFO")
        .arg(&section)
        .query::<String>(&mut conn)
        .map_err(|e| e.to_string())
}

// ─── Helpers ──────────────────────────────────────────────

#[tauri::command]
pub fn test_connection(host: String, port: u16, password: Option<String>, db: u8, state: State<AppState>) -> Result<String, String> {
    let auth = match &password {
        Some(p) if !p.is_empty() => format!(":{}@", p),
        _ => String::new(),
    };
    let url = format!("redis://{}{}:{}/{}", auth, host, port, db);
    let client = redis::Client::open(url).map_err(|e| format!("URL 解析失败: {}", e))?;
    let mut conn = client.get_connection().map_err(|e| format!("连接失败: {}", e))?;
    redis::cmd("PING")
        .query::<String>(&mut conn)
        .map_err(|e| format!("PING 失败: {}", e))?;
    Ok("PONG".to_string())
}

fn build_redis_url(conn: &RedisConnection) -> Result<String, String> {
    let auth = match &conn.password {
        Some(p) if !p.is_empty() => format!(":{}@", p),
        _ => String::new(),
    };
    Ok(format!(
        "redis://{}{}:{}/{}?timeout=5",
        auth, conn.host, conn.port, conn.db
    ))
}

fn format_redis_value(value: &redis::Value) -> String {
    match value {
        redis::Value::Nil => "(nil)".to_string(),
        redis::Value::Int(n) => n.to_string(),
        redis::Value::BulkString(data) => String::from_utf8_lossy(data).to_string(),
        redis::Value::Array(items) => {
            if items.is_empty() {
                "(empty array)".to_string()
            } else {
                items
                    .iter()
                    .enumerate()
                    .map(|(i, v)| {
                        let s = format_redis_value(v);
                        format!("{}) {}", i + 1, s)
                    })
                    .collect::<Vec<_>>()
                    .join("\n")
            }
        }
        redis::Value::SimpleString(s) => s.clone(),
        redis::Value::Okay => "OK".to_string(),
        redis::Value::Map(pairs) => {
            pairs
                .iter()
                .map(|(k, v)| format!("{}: {}", format_redis_value(k), format_redis_value(v)))
                .collect::<Vec<_>>()
                .join("\n")
        }
        redis::Value::Set(items) => {
            items
                .iter()
                .map(|v| format_redis_value(v))
                .collect::<Vec<_>>()
                .join("\n")
        }
        redis::Value::Double(n) => format!("{:.6}", n),
        redis::Value::Boolean(b) => b.to_string(),
        redis::Value::BigNumber(n) => n.to_string(),
        redis::Value::VerbatimString { format: _, text } => text.clone(),
        redis::Value::Attribute { data, attributes: _ } => format_redis_value(data),
        redis::Value::Push { kind: _, data } => {
            data.iter()
                .map(|v| format_redis_value(v))
                .collect::<Vec<_>>()
                .join(" ")
        }
        redis::Value::ServerError(e) => format!("(error) {:?}", e),
    }
}
