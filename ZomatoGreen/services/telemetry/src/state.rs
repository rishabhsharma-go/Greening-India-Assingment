use std::sync::Arc;

use sqlx::PgPool;
use tokio::sync::{mpsc, Mutex};

use crate::{domain::IngestInput, kafka::KafkaPublisher, redis_store::IdempotencyStore};

/// Shared application state threaded through every axum handler via
/// `State<Arc<AppState>>`.
#[derive(Clone)]
pub struct AppState {
    /// PostgreSQL connection pool used for reads (list_by_tree).
    pub pool: PgPool,

    /// Redis idempotency store, guarded by a Mutex so a single
    /// `ConnectionManager` is not accessed concurrently without coordination.
    pub idempotency: Arc<Mutex<IdempotencyStore>>,

    /// Sender half of the worker channel.  Handlers clone-and-send to enqueue
    /// ingest jobs without blocking on persistence or Kafka I/O.
    pub tx: mpsc::Sender<IngestInput>,

    /// Kafka publisher shared by all worker tasks (via Arc).
    pub kafka: Arc<KafkaPublisher>,
}
