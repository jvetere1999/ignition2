# Build stage
# NOTE: This Dockerfile must be built from the REPO ROOT, not app/backend
# e.g., docker build -f app/backend/Dockerfile .
FROM rust:1.84-slim-bookworm AS builder

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Recreate the local directory structure so sqlx::migrate! path works
# Path in state.rs: "../../../database/migrations" (from crates/api/src/)
# So we need: /app/crates/api/src -> ../../../database/migrations = /app/database/migrations
COPY app/backend/Cargo.toml app/backend/Cargo.lock ./
COPY app/backend/crates ./crates
COPY app/database/migrations ./database/migrations

# Build release binary with reduced parallelism to avoid OOM
ENV CARGO_BUILD_JOBS=2
RUN cargo build --release --package ignition-api

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/ignition-api /app/ignition-api

# Create non-root user
RUN useradd -r -s /bin/false ignition
USER ignition

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the binary
CMD ["/app/ignition-api"]

