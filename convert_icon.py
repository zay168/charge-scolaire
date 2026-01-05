from PIL import Image
import sys
import os

if len(sys.argv) < 3:
    print("Usage: python convert_icon.py <src_png> <dst_ico>")
    sys.exit(1)

src = sys.argv[1]
dst_ico = sys.argv[2]
dst_png = os.path.splitext(dst_ico)[0] + ".png"

try:
    img = Image.open(src)
    
    # Save as PNG first (for Linux/Web)
    img.save(dst_png, format='PNG')
    print(f"Saved PNG to {dst_png}")
    
    # Save as ICO (for Windows)
    # Windows icons often need specific sizes
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img.save(dst_ico, format='ICO', sizes=icon_sizes)
    print(f"Saved ICO to {dst_ico}")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
