
DROP INDEX IF EXISTS idx_user_date;


DROP TABLE IF EXISTS memories; 
DROP TABLE IF EXISTS memory_assets;


CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('quote', 'image', 'video', 'hybrid', 'gallery')), 
    content TEXT, 
    caption TEXT, 
    location TEXT,
    memory_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    edited_by TEXT,
    tags TEXT DEFAULT ''
);


CREATE TABLE IF NOT EXISTS memory_assets (
    id TEXT PRIMARY KEY,          
    memory_id TEXT NOT NULL,      
    asset_key TEXT NOT NULL,      
    thumbnail_key TEXT,           
    asset_type TEXT NOT NULL CHECK(asset_type IN ('image', 'video')), 
    sort_order INTEGER DEFAULT 0, 
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE 
);


CREATE INDEX IF NOT EXISTS idx_memory_date ON memories (memory_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_memory_assets_memory_id ON memory_assets (memory_id, sort_order);