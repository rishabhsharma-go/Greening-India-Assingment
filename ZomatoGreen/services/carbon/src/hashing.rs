use chrono::DateTime;
use chrono::Utc;
use sha2::{Digest, Sha256};
use uuid::Uuid;

/// Compute the SHA-256 audit hash used for hash-chaining.
///
/// The pre-image string is the concatenation (no separator) of:
///   parcel_id | co2e_kg | agb_kg | bgb_kg | tree_count | computed_at (RFC-3339) | prev_hash
///
/// This ensures that any change to the computed values or a break in the
/// chain is immediately detectable by re-computing the hash.
pub fn compute_audit_hash(
    parcel_id: &Uuid,
    co2e_kg: f64,
    agb_kg: f64,
    bgb_kg: f64,
    tree_count: i32,
    computed_at: &DateTime<Utc>,
    prev_hash: &str,
) -> String {
    let pre_image = format!(
        "{}{}{}{}{}{}{}",
        parcel_id,
        co2e_kg,
        agb_kg,
        bgb_kg,
        tree_count,
        computed_at.to_rfc3339(),
        prev_hash,
    );

    let mut hasher = Sha256::new();
    hasher.update(pre_image.as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn hash_is_64_hex_chars() {
        let id = Uuid::new_v4();
        let ts = Utc.with_ymd_and_hms(2024, 1, 1, 0, 0, 0).unwrap();
        let h = compute_audit_hash(&id, 100.0, 80.0, 20.0, 5, &ts, "");
        assert_eq!(h.len(), 64);
        assert!(h.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn different_prev_hash_gives_different_result() {
        let id = Uuid::new_v4();
        let ts = Utc.with_ymd_and_hms(2024, 1, 1, 0, 0, 0).unwrap();
        let h1 = compute_audit_hash(&id, 100.0, 80.0, 20.0, 5, &ts, "");
        let h2 = compute_audit_hash(&id, 100.0, 80.0, 20.0, 5, &ts, &h1);
        assert_ne!(h1, h2);
    }
}
