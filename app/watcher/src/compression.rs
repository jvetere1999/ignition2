pub const ZSTD_LEVEL: i32 = 19;

pub fn compress_zstd(data: &[u8]) -> Result<Vec<u8>, String> {
    zstd::bulk::compress(data, ZSTD_LEVEL)
        .map_err(|e| format!("Zstd compression failed: {}", e))
}
