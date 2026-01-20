#!/usr/bin/env python3
"""
Create valid RGBA icon files for Tauri build from SVG sources.
Renders the app icon SVG to PNG files with RGBA color space.
"""
import os
from PIL import Image
import cairosvg
from io import BytesIO

icons_dir = "app/watcher/icons"
os.makedirs(icons_dir, exist_ok=True)

# Use the app icon SVG as source
svg_source = "app/frontend/src/app/icon.svg"

# Define output sizes
sizes_with_names = [
    (32, "32x32.png"),
    (128, "128x128.png"),
    (256, "128x128@2x.png"),  # @2x is 2x the size
    (128, "tray_icon.png"),
]

print(f"Rendering SVG icon from: {svg_source}")

for size, filename in sizes_with_names:
    # Render SVG to PNG via cairosvg
    png_data = cairosvg.svg2png(
        url=svg_source,
        write_to=BytesIO(),
        output_width=size,
        output_height=size,
    )
    
    # Convert to RGBA if needed
    img = Image.open(BytesIO(png_data)).convert("RGBA")
    
    filepath = os.path.join(icons_dir, filename)
    img.save(filepath, "PNG")
    print(f"✓ Created {filepath} ({size}x{size} RGBA)")

print("\n✓ All PNG icons created from SVG in RGBA format")
print("✓ Note: icon.icns and icon.ico must be generated separately on their respective platforms")
