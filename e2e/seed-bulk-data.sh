#!/bin/sh
set -e

echo "=== Setting up MinIO alias ==="
mc alias set local http://minio:9000 minioadmin minioadmin

# ─────────────────────────────────────────────────────────────────────────
# 1. Create buckets
# ─────────────────────────────────────────────────────────────────────────
echo "=== Creating buckets ==="
mc mb --ignore-existing local/test-bucket
mc mb --ignore-existing local/bulk-bucket
mc mb --ignore-existing local/types-bucket
mc mb --ignore-existing local/empty-bucket
mc mb --ignore-existing local/versioned-bucket

# ─────────────────────────────────────────────────────────────────────────
# 2. Seed test-bucket (basic CRUD test data)
# ─────────────────────────────────────────────────────────────────────────
echo "=== Seeding test-bucket ==="
echo 'Hello from S3 Viewer!' > /tmp/hello.txt
echo '{"name": "test", "version": 1}' > /tmp/test.json
mc cp /tmp/hello.txt local/test-bucket/hello.txt
mc cp /tmp/test.json local/test-bucket/test.json
mc cp /tmp/hello.txt local/test-bucket/documents/readme.txt
mc cp /tmp/test.json local/test-bucket/documents/config/settings.json
mc cp /tmp/hello.txt local/test-bucket/images/photo.txt

# ─────────────────────────────────────────────────────────────────────────
# 3. Seed bulk-bucket — 5 levels deep + flat files = 10,000+ objects
# ─────────────────────────────────────────────────────────────────────────
echo "=== Generating 5-level deep hierarchy for bulk-bucket ==="
mkdir -p /tmp/bulk

# 5-level deep: 10 x 5 x 5 x 4 x 10 files = 10,000 files
# level1 (10) -> level2 (5) -> level3 (5) -> level4 (4) -> 10 files each
for l1 in $(seq -w 1 10); do
  for l2 in $(seq -w 1 5); do
    for l3 in $(seq -w 1 5); do
      for l4 in $(seq -w 1 4); do
        dir="/tmp/bulk/level1-${l1}/level2-${l2}/level3-${l3}/level4-${l4}"
        mkdir -p "$dir"
        for f in $(seq -w 1 10); do
          echo "content-${l1}-${l2}-${l3}-${l4}-${f}" > "${dir}/file-${f}.txt"
        done
      done
    done
  done
  echo "  Generated level1-${l1}..."
done

echo "=== Uploading 5-level deep hierarchy to bulk-bucket ==="
mc cp --recursive /tmp/bulk/ local/bulk-bucket/

# Add flat files at root for pagination testing (need >200 to trigger truncation)
# Prefix with "zz-" so they sort AFTER level1-* folders in S3 lexicographic order
echo "=== Adding flat files to bulk-bucket root for pagination ==="
mkdir -p /tmp/bulk-flat
for i in $(seq -w 1 250); do
  echo "flat-${i}" > "/tmp/bulk-flat/zz-flat-file-${i}.txt"
done
mc cp --recursive /tmp/bulk-flat/ local/bulk-bucket/

# Verify count
DEEP_COUNT=$(mc ls --recursive local/bulk-bucket/ | wc -l | tr -d ' ')
echo "=== Seeded ${DEEP_COUNT} objects in bulk-bucket (deep hierarchy + flat files) ==="

# ─────────────────────────────────────────────────────────────────────────
# 4. Seed types-bucket — diverse file types and sizes
# ─────────────────────────────────────────────────────────────────────────
echo "=== Seeding types-bucket with diverse file types ==="
mkdir -p /tmp/types

# --- text/ ---
mkdir -p /tmp/types/text
echo "Small text file content" > /tmp/types/text/small.txt
# 10 KB text file
dd if=/dev/urandom bs=1024 count=10 2>/dev/null | base64 > /tmp/types/text/medium.txt
# 1 MB text file
dd if=/dev/urandom bs=1024 count=1024 2>/dev/null | base64 > /tmp/types/text/large.txt
echo "Unicode content: 日本語テスト 中文测试 한국어" > "/tmp/types/text/unicode-名前.txt"

# --- json/ ---
mkdir -p /tmp/types/json
echo '{"name": "config", "version": 2, "debug": false}' > /tmp/types/json/config.json
echo '[1, 2, 3, "four", null, true]' > /tmp/types/json/array.json
cat > /tmp/types/json/nested.json << 'JSONEOF'
{
  "users": [
    {"id": 1, "name": "Alice", "roles": ["admin", "user"]},
    {"id": 2, "name": "Bob", "roles": ["user"]}
  ],
  "metadata": {
    "version": "1.0",
    "generated": "2024-01-01T00:00:00Z"
  }
}
JSONEOF

# --- images/ (valid file headers) ---
mkdir -p /tmp/types/images
# 1x1 pixel PNG (valid)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > /tmp/types/images/tiny.png
# Minimal JPEG header
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9' > /tmp/types/images/small.jpg
# SVG
cat > /tmp/types/images/icon.svg << 'SVGEOF'
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="#4A90D9"/>
</svg>
SVGEOF
# Minimal GIF header (GIF89a)
printf 'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x00\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;' > /tmp/types/images/photo.gif

# --- documents/ ---
mkdir -p /tmp/types/documents
cat > /tmp/types/documents/readme.md << 'MDEOF'
# Test Document

This is a **markdown** file for testing.

- Item 1
- Item 2
- Item 3

```javascript
console.log("hello");
```
MDEOF
echo "name,age,city" > /tmp/types/documents/data.csv
echo "Alice,30,NYC" >> /tmp/types/documents/data.csv
echo "Bob,25,London" >> /tmp/types/documents/data.csv
cat > /tmp/types/documents/data.xml << 'XMLEOF'
<?xml version="1.0" encoding="UTF-8"?>
<root>
  <item id="1">First</item>
  <item id="2">Second</item>
</root>
XMLEOF
echo "body { margin: 0; padding: 0; font-family: sans-serif; }" > /tmp/types/documents/styles.css

# --- binary/ ---
mkdir -p /tmp/types/binary
# Create a fake ZIP file (zip command may not be available in minimal Docker images)
dd if=/dev/urandom bs=1024 count=1 of=/tmp/types/binary/archive.zip 2>/dev/null
# 100 KB random binary
dd if=/dev/urandom bs=1024 count=100 of=/tmp/types/binary/data.bin 2>/dev/null
# Empty file (0 bytes)
touch /tmp/types/binary/empty.dat

# --- code/ ---
mkdir -p /tmp/types/code
echo 'console.log("Hello from JavaScript");' > /tmp/types/code/script.js
echo 'print("Hello from Python")' > /tmp/types/code/app.py
cat > /tmp/types/code/main.go << 'GOEOF'
package main

import "fmt"

func main() {
    fmt.Println("Hello from Go")
}
GOEOF
cat > /tmp/types/code/Dockerfile << 'DKEOF'
FROM alpine:latest
RUN echo "hello"
CMD ["sh"]
DKEOF

# --- special-names/ ---
mkdir -p /tmp/types/special-names
echo "spaces" > "/tmp/types/special-names/file with spaces.txt"
echo "plus" > "/tmp/types/special-names/file+plus.txt"
echo "percent" > "/tmp/types/special-names/file%percent.txt"
echo "upper" > "/tmp/types/special-names/UPPERCASE.TXT"
echo "hidden" > "/tmp/types/special-names/.hidden-file"
echo "no ext" > "/tmp/types/special-names/no-extension"

# --- large-files/ ---
mkdir -p /tmp/types/large-files
dd if=/dev/urandom bs=1024 count=5120 of=/tmp/types/large-files/5mb-file.bin 2>/dev/null
dd if=/dev/urandom bs=1024 count=10240 of=/tmp/types/large-files/10mb-file.bin 2>/dev/null

echo "=== Uploading types-bucket files ==="
mc cp --recursive /tmp/types/ local/types-bucket/

TYPES_COUNT=$(mc ls --recursive local/types-bucket/ | wc -l | tr -d ' ')
echo "=== Seeded ${TYPES_COUNT} objects in types-bucket ==="

# ─────────────────────────────────────────────────────────────────────────
# 5. Seed versioned-bucket — versioning enabled with multiple versions
# ─────────────────────────────────────────────────────────────────────────
echo "=== Setting up versioned-bucket ==="
mc version enable local/versioned-bucket

# Upload version 1
echo "Version 1 content" > /tmp/versioned.txt
mc cp /tmp/versioned.txt local/versioned-bucket/versioned-file.txt

# Upload version 2
echo "Version 2 content - updated" > /tmp/versioned.txt
mc cp /tmp/versioned.txt local/versioned-bucket/versioned-file.txt

# Upload version 3
echo "Version 3 content - latest" > /tmp/versioned.txt
mc cp /tmp/versioned.txt local/versioned-bucket/versioned-file.txt

# Upload a file then delete it (creates delete marker)
echo "This will be deleted" > /tmp/to-delete.txt
mc cp /tmp/to-delete.txt local/versioned-bucket/deleted-file.txt
mc rm local/versioned-bucket/deleted-file.txt

echo "=== Versioned-bucket setup complete ==="

# ─────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "  Seed Complete!"
echo "========================================="
echo "  test-bucket:      5 objects (3 levels)"
echo "  bulk-bucket:      ${DEEP_COUNT} objects (5 levels deep + 250 flat)"
echo "  types-bucket:     ${TYPES_COUNT} objects (diverse types/sizes)"
echo "  empty-bucket:     0 objects"
echo "  versioned-bucket: 3 versions + 1 delete marker"
echo "========================================="
