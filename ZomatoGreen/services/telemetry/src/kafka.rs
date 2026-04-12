use anyhow::Result;
use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::time::Duration;

use crate::domain::TelemetryEvent;

/// Thin wrapper around an rdkafka `FutureProducer` that publishes
/// serialised [`TelemetryEvent`] JSON to a single Kafka topic.
pub struct KafkaPublisher {
    producer: FutureProducer,
    topic: String,
}

impl KafkaPublisher {
    /// Build a producer connected to `brokers` that delivers to `topic`.
    ///
    /// `brokers` should be a comma-separated list of `host:port` pairs,
    /// e.g. `"kafka:9092"`.
    pub fn new(brokers: &str, topic: &str) -> Result<Self> {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("message.timeout.ms", "5000")
            // Moderate batching for low-latency IoT traffic.
            .set("linger.ms", "5")
            .create()?;

        Ok(Self {
            producer,
            topic: topic.to_string(),
        })
    }

    /// Serialise `event` as JSON and send it to the configured topic.
    ///
    /// The message key is the `tree_id` so that all measurements for a given
    /// tree land in the same Kafka partition (preserving order per tree).
    pub async fn publish(&self, event: &TelemetryEvent) -> Result<()> {
        let payload = serde_json::to_string(event)?;
        let key = event.tree_id.to_string();

        let record = FutureRecord::to(&self.topic)
            .key(key.as_str())
            .payload(payload.as_str());

        self.producer
            .send(record, Duration::from_secs(5))
            .await
            .map_err(|(e, _)| anyhow::anyhow!("kafka send error: {}", e))?;

        Ok(())
    }
}
