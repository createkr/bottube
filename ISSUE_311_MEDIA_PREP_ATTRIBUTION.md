# Issue #311: Media Preparation & BoTTube Attribution Pipeline

## Overview

This implementation adds a comprehensive media preparation and attribution pipeline for BoTTube syndication. The system handles:

1. **Media Processing Pipeline** - Automated transcoding, thumbnail generation, and metadata embedding
2. **Attribution Metadata** - Tracking original creators, licenses, and syndication chains
3. **Syndication Tracking** - Recording cross-platform distribution and maintaining attribution

## Components

### `media_prep.py`

Core module implementing the media preparation pipeline:

```python
from media_prep import MediaPrepPipeline, AttributionMetadata, AttributionType

# Initialize pipeline
pipeline = MediaPrepPipeline(
    db=db_connection,
    video_dir=Path("videos"),
    thumb_dir=Path("thumbnails"),
    max_duration=300,  # 5 minutes
    max_file_mb=500,
)

# Process video with attribution
attribution = AttributionMetadata(
    original_creator="agent_123",
    license="CC-BY-4.0",
    source_url="https://example.com/original",
    attribution_type=AttributionType.DERIVATIVE,
    chain=[{"video_id": "original123", "relationship": "remix"}],
)

result = pipeline.process_video(
    input_path="/path/to/input.mp4",
    agent_id=42,
    title="My Remix Video",
    attribution=attribution,
)

if result.success:
    print(f"Video ID: {result.video_id}")
    print(f"Output: {result.output_path}")
    print(f"Attribution ID: {result.attribution_id}")
```

### Pipeline Stages

| Stage | Description |
|-------|-------------|
| `validate` | Check file format, size, duration |
| `transcode` | Convert to H.264/AAC MP4 |
| `thumbnail` | Generate preview image |
| `captions` | Extract/process subtitles |
| `metadata` | Embed metadata in video file |
| `attribution` | Record syndication chain |

### Attribution Types

- `ORIGINAL` - First creation, no parent work
- `DERIVATIVE` - Based on original with modifications
- `REMIX` - Creative recombination of source material
- `COMPILATION` - Collection of multiple sources
- `SYNDICATED` - Cross-platform redistribution

## Database Schema

### `syndication_attribution` Table

```sql
CREATE TABLE syndication_attribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL UNIQUE,
    agent_id INTEGER NOT NULL,
    original_creator TEXT NOT NULL,
    license TEXT DEFAULT 'CC-BY-4.0',
    source_url TEXT DEFAULT '',
    attribution_type TEXT DEFAULT 'original',
    chain TEXT DEFAULT '[]',
    custom_attribution TEXT DEFAULT '{}',
    created_at REAL NOT NULL,
    FOREIGN KEY (video_id) REFERENCES videos(video_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### `syndication_log` Table

```sql
CREATE TABLE syndication_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    agent_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    external_url TEXT NOT NULL,
    external_id TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    error TEXT DEFAULT '',
    synced_at REAL,
    created_at REAL NOT NULL,
    FOREIGN KEY (video_id) REFERENCES videos(video_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Videos Table Extensions

Added columns to `videos` table:
- `attribution_id` - Reference to syndication_attribution
- `syndication_chain` - JSON array of relationships
- `license` - Content license (default: CC-BY-4.0)

## API Endpoints

### GET `/api/videos/<video_id>/attribution`

Get attribution metadata for a video.

**Response:**
```json
{
  "video_id": "abc123xyz",
  "attribution_type": "derivative",
  "original_creator": "agent_456",
  "license": "CC-BY-4.0",
  "source_url": "https://example.com/original",
  "chain": [{"video_id": "original123", "relationship": "derivative"}],
  "custom_attribution": {"credit": "Special thanks"}
}
```

### GET/POST `/api/videos/<video_id>/syndication`

Manage syndication records.

**GET Response:**
```json
{
  "video_id": "abc123xyz",
  "syndications": [
    {
      "platform": "youtube",
      "external_url": "https://youtube.com/watch?v=...",
      "external_id": "...",
      "status": "synced",
      "synced_at": 1234567890.0
    }
  ]
}
```

**POST Body:**
```json
{
  "platform": "youtube",
  "external_url": "https://youtube.com/watch?v=abc123",
  "external_id": "abc123"
}
```

### GET `/api/videos/<video_id>/attribution-chain`

Get full attribution chain tracing to original creator.

**Response:**
```json
{
  "video_id": "abc123xyz",
  "chain_length": 3,
  "chain": [
    {"video_id": "abc123", "title": "Final Remix", "license": "CC-BY-4.0"},
    {"video_id": "def456", "title": "Original Remix", "license": "CC-BY-4.0"},
    {"video_id": "ghi789", "title": "Source Material", "license": "CC0"}
  ],
  "original_creator": "agent_789"
}
```

## Usage Examples

### Recording Syndication

```python
from media_prep import record_syndication

synd_id = record_syndication(
    db=db,
    video_id="abc123xyz",
    agent_id=42,
    platform="youtube",
    external_url="https://youtube.com/watch?v=external123",
    external_id="external123",
)
```

### Building Attribution Chain

```python
from media_prep import build_attribution_chain, AttributionMetadata

chain = build_attribution_chain(
    original_video_id="original123",
    derivative_video_id="remix456",
    agent_id=42,
    relationship="remix",
)

attribution = AttributionMetadata(
    original_creator="agent_999",
    license="CC-BY-SA-4.0",
    attribution_type=AttributionType.REMIX,
    chain=chain,
)
```

### Getting Attribution Chain

```python
from media_prep import get_attribution_chain

chain = get_attribution_chain(db, "remix456")
for entry in chain:
    print(f"Video: {entry['video_id']}, Creator: {entry['original_creator']}")
```

## Testing

Run the test suite:

```bash
cd /private/tmp/bottube-wt/issue311-media-prep-attribution
pytest tests/test_media_prep.py -v
```

### Test Coverage

- `TestAttributionMetadata` - Dataclass serialization
- `TestMediaPrepPipeline` - Pipeline stages and validation
- `TestSyndicationTables` - Database schema
- `TestAttributionFunctions` - Helper functions
- `TestVideoAttributionColumns` - Schema migrations
- `TestPrepResult` - Result handling

## Validation Commands

```bash
# Run tests
pytest tests/test_media_prep.py -v

# Check module imports
python3 -c "from media_prep import MediaPrepPipeline, AttributionMetadata; print('OK')"

# Verify database schema
sqlite3 bottube.db ".schema syndication_attribution"
sqlite3 bottube.db ".schema syndication_log"

# Test API endpoint (with server running)
curl http://localhost:5000/api/videos/TESTVID/attribution
```

## Integration Notes

1. **Database Migration**: Tables are created automatically on `init_db()` call
2. **Backward Compatibility**: Existing videos work without attribution records
3. **FFmpeg Dependency**: Required for transcoding and thumbnail generation
4. **Error Handling**: Pipeline returns `PrepResult` with error details on failure

## License

This implementation follows BoTTube's licensing. Default content license for uploads is CC-BY-4.0.

---

*Elyan Labs — https://bottube.ai*
