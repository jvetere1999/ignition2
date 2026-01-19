-- Create DAW project files table
CREATE TABLE IF NOT EXISTS daw_project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL, -- SHA256
    content_type VARCHAR(50) NOT NULL, -- .als, .flp, .logicx, .serum, etc
    storage_key VARCHAR(512) NOT NULL, -- R2 key path
    encrypted BOOLEAN NOT NULL DEFAULT true,
    current_version_id UUID NOT NULL,
    version_count INT NOT NULL DEFAULT 1,
    last_modified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_version FOREIGN KEY (current_version_id) REFERENCES daw_project_versions(id)
);

-- Create DAW project versions table
CREATE TABLE IF NOT EXISTS daw_project_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES daw_project_files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL, -- SHA256
    storage_key VARCHAR(512) NOT NULL, -- R2 key path
    change_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, version_number)
);

-- Create upload sessions table
CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    total_size BIGINT NOT NULL,
    chunks_received INT NOT NULL DEFAULT 0,
    total_chunks INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'uploading', -- uploading, complete, failed
    storage_key VARCHAR(512) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daw_user_id ON daw_project_files(user_id, last_modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_daw_project_versions_project ON daw_project_versions(project_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_daw_upload_sessions_user ON upload_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_daw_upload_sessions_expires ON upload_sessions(expires_at);

-- Create audit table for DAW operations
CREATE TABLE IF NOT EXISTS daw_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID,
    action VARCHAR(50) NOT NULL, -- upload, download, delete, restore
    project_name VARCHAR(255),
    file_size BIGINT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daw_audit_user ON daw_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daw_audit_project ON daw_audit_log(project_id, created_at DESC);
