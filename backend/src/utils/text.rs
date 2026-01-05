// Text utilities

use slug::slugify as slug_slugify;

/// Convert a string to a URL-safe slug
/// Uses the `slug` crate for proper Unicode/i18n handling
pub fn slugify(s: &str) -> String {
    slug_slugify(s)
}

/// Count words in text
pub fn count_words(text: &str) -> i32 {
    text.split_whitespace().count() as i32
}
