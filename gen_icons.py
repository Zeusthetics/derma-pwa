from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs('/home/claude/derm-pwa/icons', exist_ok=True)

for size in [192, 512]:
    img = Image.new('RGB', (size, size), '#1D9E75')
    draw = ImageDraw.Draw(img)
    # Draw a simple "D" letter
    font_size = size // 2
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', font_size)
    except:
        font = ImageFont.load_default()
    text = 'D'
    bbox = draw.textbbox((0,0), text, font=font)
    tw = bbox[2]-bbox[0]
    th = bbox[3]-bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1]
    draw.text((x, y), text, fill='white', font=font)
    img.save(f'/home/claude/derm-pwa/icons/icon-{size}.png')
    print(f'Created icon-{size}.png')
