// Text utilities

/// Convert a string to a URL-safe slug
pub fn slugify(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>()
        .to_lowercase()
}

/// Count words in text
pub fn count_words(text: &str) -> i32 {
    text.split_whitespace().count() as i32
}
