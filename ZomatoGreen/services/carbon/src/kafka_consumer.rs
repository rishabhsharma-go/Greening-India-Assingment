use anyhow::Result;
use chrono::Utc;
use rdkafka::{
    config::ClientConfig,
    consumer::{CommitMode, Consumer, StreamConsumer},
    message::Message,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    db::{create_audit, get_latest_hash, get_parcel_for_tree, list_alive_trees_for_parcel},
    domain::{
        compute_agb, compute_bgb, compute_co2e, CarbonAudit, TelemetryEventMsg, TreeWithSpecies,
    },
    hashing::compute_audit_hash,
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/// Spawn a long-running Kafka consumer that listens on `topic` and creates
/// carbon audit records for each telemetry event received.
///
/// This function never returns under normal operation; it should be called
/// with `tokio::spawn`.
pub async fn run_consumer(brokers: &str, topic: &str, group_id: &str, pool: PgPool) {
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", group_id)
        .set("bootstrap.servers", brokers)
        .set("enable.auto.commit", "true")
        .set("auto.offset.reset", "earliest")
        // Required for confluent's librdkafka health checks.
        .set("session.timeout.ms", "30000")
        .create()
        .expect("Kafka consumer creation failed");

    consumer
        .subscribe(&[topic])
        .expect("Failed to subscribe to Kafka topic");

    tracing::info!("Kafka consumer subscribed to topic '{topic}' on brokers '{brokers}'");

    loop {
        match consumer.recv().await {
            Err(e) => {
                tracing::error!("Kafka receive error: {}", e);
            }
            Ok(m) => {
                if let Some(payload) = m.payload() {
                    match serde_json::from_slice::<TelemetryEventMsg>(payload) {
                        Ok(event) => {
                            if let Err(e) = process_event(&pool, &event).await {
                                tracing::error!(
                                    tree_id = %event.tree_id,
                                    "Error processing telemetry event: {e}"
                                );
                            }
                        }
                        Err(e) => {
                            tracing::warn!("Failed to deserialise Kafka message: {e}");
                        }
                    }
                }
                // Commit offset regardless of processing success so we don't
                // block indefinitely on a poison-pill message.
                if let Err(e) = consumer.commit_message(&m, CommitMode::Async) {
                    tracing::warn!("Failed to commit Kafka offset: {e}");
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Per-event processing
// ---------------------------------------------------------------------------

async fn process_event(pool: &PgPool, event: &TelemetryEventMsg) -> Result<()> {
    // 1. Resolve the parcel that owns this tree.
    let parcel_id = match get_parcel_for_tree(pool, event.tree_id).await? {
        Some(id) => id,
        None => {
            tracing::warn!(tree_id = %event.tree_id, "Tree not found – skipping event");
            return Ok(());
        }
    };

    // 2. Fetch all alive trees with allometric data for the parcel.
    let trees = list_alive_trees_for_parcel(pool, parcel_id).await?;

    if trees.is_empty() {
        tracing::debug!(parcel_id = %parcel_id, "No alive trees – skipping audit creation");
        return Ok(());
    }

    // 3. Compute parcel-level totals.
    let (total_agb, total_bgb, total_co2e) = compute_totals(&trees);
    let tree_count = trees.len() as i32;

    // 4. Retrieve the previous hash for chain linking.
    let prev_hash = get_latest_hash(pool, parcel_id).await.unwrap_or_default();

    // 5. Build and persist the audit record.
    let now = Utc::now();
    let hash = compute_audit_hash(
        &parcel_id,
        total_co2e,
        total_agb,
        total_bgb,
        tree_count,
        &now,
        &prev_hash,
    );

    let audit = CarbonAudit {
        id: Uuid::new_v4(),
        parcel_id,
        co2e_kg: total_co2e,
        agb_kg: total_agb,
        bgb_kg: total_bgb,
        tree_count,
        computed_at: now,
        hash,
        prev_hash,
    };

    create_audit(pool, &audit).await?;

    tracing::info!(
        parcel_id  = %parcel_id,
        tree_count = tree_count,
        co2e_kg    = %format!("{:.2}", total_co2e),
        "Carbon audit created"
    );

    Ok(())
}

// ---------------------------------------------------------------------------
// Helper: aggregate AGB / BGB / CO2e across a slice of trees
// ---------------------------------------------------------------------------

fn compute_totals(trees: &[TreeWithSpecies]) -> (f64, f64, f64) {
    let total_agb: f64 = trees
        .iter()
        .map(|t| {
            compute_agb(
                t.diameter_cm,
                t.agb_coefficient_a,
                t.agb_coefficient_b,
                t.wood_density_rho,
            )
        })
        .sum();

    let total_bgb = compute_bgb(total_agb);
    let total_co2e = compute_co2e(total_agb, total_bgb);

    (total_agb, total_bgb, total_co2e)
}
