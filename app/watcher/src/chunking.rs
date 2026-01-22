use sha2::{Digest, Sha256};
use std::sync::OnceLock;

#[derive(Debug, Clone)]
pub struct ChunkSettings {
    pub min_size: usize,
    pub avg_size: usize,
    pub max_size: usize,
    pub mask: u64,
}

impl Default for ChunkSettings {
    fn default() -> Self {
        let avg_size = 1 * 1024 * 1024;
        let mask = (1u64 << 20) - 1; // 1MB average
        Self {
            min_size: 256 * 1024,
            avg_size,
            max_size: 4 * 1024 * 1024,
            mask,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ChunkBoundary {
    pub offset: usize,
    pub length: usize,
}

#[derive(Debug, Clone)]
pub struct ChunkDescriptor {
    pub index: usize,
    pub hash: String,
    pub size: usize,
    pub offset: usize,
    pub length: usize,
}

pub fn chunk_bytes(data: &[u8], settings: &ChunkSettings) -> Vec<ChunkBoundary> {
    let gear = gear_table();
    let mut chunks = Vec::new();

    let mut start = 0usize;
    let mut hash: u64 = 0;

    for (idx, byte) in data.iter().enumerate() {
        hash = hash.wrapping_shl(1).wrapping_add(gear[*byte as usize]);
        let size = idx + 1 - start;

        if size < settings.min_size {
            continue;
        }

        let boundary = (hash & settings.mask) == 0 || size >= settings.max_size;
        if boundary {
            chunks.push(ChunkBoundary {
                offset: start,
                length: size,
            });
            start = idx + 1;
            hash = 0;
        }
    }

    if start < data.len() {
        chunks.push(ChunkBoundary {
            offset: start,
            length: data.len() - start,
        });
    }

    chunks
}

pub fn build_chunk_descriptors(data: &[u8], settings: &ChunkSettings) -> Vec<ChunkDescriptor> {
    let boundaries = chunk_bytes(data, settings);

    boundaries
        .into_iter()
        .enumerate()
        .map(|(index, boundary)| {
            let slice = &data[boundary.offset..boundary.offset + boundary.length];
            let mut hasher = Sha256::new();
            hasher.update(slice);
            let hash = format!("{:x}", hasher.finalize());

            ChunkDescriptor {
                index,
                hash,
                size: boundary.length,
                offset: boundary.offset,
                length: boundary.length,
            }
        })
        .collect()
}

fn gear_table() -> &'static [u64; 256] {
    static TABLE: OnceLock<[u64; 256]> = OnceLock::new();

    TABLE.get_or_init(|| {
        let mut table = [0u64; 256];
        let mut seed: u64 = 0x9E37_79B9_7F4A_7C15;
        for value in &mut table {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            *value = seed;
        }
        table
    })
}
