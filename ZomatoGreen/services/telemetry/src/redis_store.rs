use anyhow::Result;
use redis::{aio::ConnectionManager, AsyncCommands};

/// Redis-backed idempotency store.
///
/// Uses a Redis `SET key 1 NX EX 86400` command to atomically check-and-set
/// a 24-hour TTL key.  Returns `true` if the key was newly set (i.e. the
/// event is being seen for the first time) or `false` if the key already
/// existed (duplicate event).
pub struct IdempotencyStore {
    conn: ConnectionManager,
}

impl IdempotencyStore {
    /// Connect to Redis using the given URL (e.g. `redis://redis:6379`).
    pub async fn new(redis_url: &str) -> Result<Self> {
        let client = redis::Client::open(redis_url)?;
        let conn = ConnectionManager::new(client).await?;
        Ok(Self { conn })
    }

    /// Atomically check and set `key` with a 24-hour expiry.
    ///
    /// Returns `true`  – key did not exist; caller should process the event.
    /// Returns `false` – key already existed; caller should treat as duplicate.
    pub async fn check_and_set(&mut self, key: &str) -> Result<bool> {
        // SET key 1 NX EX 86400
        // NX  – only set if Not eXists
        // EX  – expire in seconds
        let result: bool = redis::cmd("SET")
            .arg(key)
            .arg("1")
            .arg("NX")
            .arg("EX")
            .arg(86_400_u32) // 24 hours
            .query_async(&mut self.conn)
            .await?;

        Ok(result)
    }
}
