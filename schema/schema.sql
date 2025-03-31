CREATE TABLE IF NOT EXISTS memories ( 
    id TEXT PRIMARY KEY, 
    user_id TEXT NOT NULL, 
    type TEXT NOT NULL CHECK(type IN ('quote', 'image', 'video', 'hybrid', 'gallery')), 
    content TEXT, asset_key TEXT, 
    caption TEXT, location TEXT, 
    memory_date DATETIME NOT NULL, 
    updated_at DATETIME, 
    edited_by TEXT, 
    tags TEXT DEFAULT '', 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP 
    ); 

CREATE INDEX IF NOT EXISTS idx_user_date ON memories (user_id, memory_date DESC, id DESC);


CREATE TABLE IF NOT EXISTS memory_gallery_assets (
    memory_id TEXT NOT NULL,        -- Foreign key to the memories table
    asset_key TEXT NOT NULL,        -- The key of the image/video in R2
    display_order INTEGER DEFAULT 0, -- Optional: For ordering items in the gallery
    PRIMARY KEY (memory_id, asset_key), -- Prevent duplicates for the same memory
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE -- If memory is deleted, gallery links are removed
);

-- Index for efficiently fetching gallery assets for a memory
CREATE INDEX IF NOT EXISTS idx_gallery_memory_id ON memory_gallery_assets (memory_id, display_order);