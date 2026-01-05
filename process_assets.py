from PIL import Image
import sys
import os

def create_installer_sidebar(src_path, dst_path):
    try:
        img = Image.open(src_path)
        
        # Target aspect ratio 164:314 (approx 0.52)
        target_ratio = 164 / 314
        width, height = img.size
        current_ratio = width / height
        
        if current_ratio > target_ratio:
            # Too wide, crop width
            new_width = int(height * target_ratio)
            left = (width - new_width) // 2
            img = img.crop((left, 0, left + new_width, height))
        else:
            # Too tall, crop height
            new_height = int(width / target_ratio)
            top = (height - new_height) // 2
            img = img.crop((0, top, width, top + new_height))
            
        # Resize to recommended NSIS size (or double for high DPI)
        # 164x314 is standard. Let's do 328x628 for crispness
        img = img.resize((164, 314), Image.Resampling.LANCZOS)
        
        # Save as BMP
        img.save(dst_path, format='BMP')
        print(f"✅ Created sidebar: {dst_path}")
        
    except Exception as e:
        print(f"❌ Error sidebar: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python process_assets.py <src> <dst>")
        sys.exit(1)
        
    create_installer_sidebar(sys.argv[1], sys.argv[2])
