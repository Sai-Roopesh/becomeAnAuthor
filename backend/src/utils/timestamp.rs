//! Timestamp serialization helpers for IPC
//! Stores i64 internally, serializes as RFC3339 for human-readable files

use serde::{Deserializer, Serializer};
use chrono::{DateTime, Utc};

/// Serialize i64 timestamp as RFC3339 string for file storage
pub fn serialize_as_rfc3339<S>(ts: &i64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    let dt = DateTime::from_timestamp_millis(*ts)
        .unwrap_or_else(|| Utc::now());
    serializer.serialize_str(&dt.to_rfc3339())
}

/// Deserialize i64 from RFC3339 string
pub fn deserialize_from_rfc3339<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: Deserializer<'de>,
{
    let s: String = serde::Deserialize::deserialize(deserializer)?;
    if s.is_empty() {
        return Ok(Utc::now().timestamp_millis());
    }
    DateTime::parse_from_rfc3339(&s)
        .map(|dt| dt.timestamp_millis())
        .map_err(serde::de::Error::custom)
}

/// Get current timestamp in milliseconds
pub fn now_millis() -> i64 {
    Utc::now().timestamp_millis()
}

/// Convert i64 timestamp to RFC3339 string
pub fn to_rfc3339(ts: i64) -> String {
    DateTime::from_timestamp_millis(ts)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| Utc::now().to_rfc3339())
}
