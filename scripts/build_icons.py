import os
import cv2
import numpy as np
from PIL import Image

def generate_all_icons():
    print("Starting icon generation from LOOPD_ICON.png...")
    src_path = 'LOOPD_ICON.png'
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Source file {src_path} not found")

    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    h, w, _ = arr.shape
    gray = cv2.cvtColor(np.array(img.convert('RGB')), cv2.COLOR_RGB2GRAY)

    # Disc center and radius fitted to LOOPD_ICON.png
    cx, cy, R = 612.0, 686.3, 388.0
    y, x = np.ogrid[:h, :w]
    dist_disc = np.sqrt((x - cx)**2 + (y - cy)**2)

    # 1. Disc alpha with 2px anti-aliasing
    disc_alpha = np.clip((R + 1.0 - dist_disc) / 2.0, 0.0, 1.0)

    # 2. Note alpha outside disc with smooth anti-aliased edge
    outside_disc = dist_disc > R
    note_alpha = np.clip((gray.astype(np.float32) - 2.0) / 6.0, 0.0, 1.0)

    # 3. Combined alpha
    combined_alpha = np.where(outside_disc, note_alpha, np.maximum(disc_alpha, note_alpha))

    result_arr = arr.copy()
    result_arr[:, :, 3] = (combined_alpha * 255.0).astype(np.uint8)
    transparent_full = Image.fromarray(result_arr.astype(np.uint8))

    # Crop tightly centered on the logo
    crop_cx, crop_cy = 636, 612
    crop_half = 475
    crop_box = (
        max(0, int(crop_cx - crop_half)),
        max(0, int(crop_cy - crop_half)),
        min(w, int(crop_cx + crop_half)),
        min(h, int(crop_cy + crop_half))
    )
    cropped_logo = transparent_full.crop(crop_box)

    os.makedirs('assets/images', exist_ok=True)

    # Save transparent logo for in-app header, library, settings, etc.
    cropped_logo.save('assets/images/logo-transparent.png', 'PNG')
    cropped_logo.save('assets/images/loopd-icon.png', 'PNG')
    cropped_logo.save('assets/images/logo.png', 'PNG')
    print("Saved assets/images/logo-transparent.png, loopd-icon.png, logo.png")

    # Monochrome version for Android 13+ Material You themed icons
    cropped_arr = np.array(cropped_logo, dtype=np.float32)
    c_gray = 0.299 * cropped_arr[:, :, 0] + 0.587 * cropped_arr[:, :, 1] + 0.114 * cropped_arr[:, :, 2]
    norm_mono = np.clip((c_gray - 10.0) / 180.0, 0.0, 1.0)
    mono_arr = np.zeros_like(cropped_arr, dtype=np.uint8)
    mono_arr[:, :, 0] = 255
    mono_arr[:, :, 1] = 255
    mono_arr[:, :, 2] = 255
    mono_arr[:, :, 3] = (norm_mono * (cropped_arr[:, :, 3] / 255.0) * 255.0).astype(np.uint8)
    cropped_mono = Image.fromarray(mono_arr)

    # 1. Android Adaptive Foreground: 1024x1024 canvas
    # Safe zone for Android adaptive icons is 66% (682px diameter circle)
    # Using 580px ensures 100% of the logo is inside the safe zone (zero clipping on any launcher)
    fg_1024 = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    target_sz = 580
    scaled_fg = cropped_logo.resize((target_sz, target_sz), Image.Resampling.LANCZOS)
    offset = (1024 - target_sz) // 2
    fg_1024.paste(scaled_fg, (offset, offset), scaled_fg)
    fg_1024.save('assets/images/android-icon-foreground.png', 'PNG')
    fg_1024.save('assets/adaptive-icon.png', 'PNG')
    print("Saved assets/images/android-icon-foreground.png and assets/adaptive-icon.png")

    # 2. Android Adaptive Monochrome: 1024x1024 canvas
    mono_1024 = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    scaled_mono = cropped_mono.resize((target_sz, target_sz), Image.Resampling.LANCZOS)
    mono_1024.paste(scaled_mono, (offset, offset), scaled_mono)
    mono_1024.save('assets/images/android-icon-monochrome.png', 'PNG')
    print("Saved assets/images/android-icon-monochrome.png")

    # 3. Android Adaptive Background: 1024x1024 rich dark background
    bg_arr = np.full((1024, 1024, 4), [12, 16, 15, 255], dtype=np.float32)
    bg_y, bg_x = np.ogrid[:1024, :1024]
    bg_dist = np.sqrt((bg_x - 512)**2 + (bg_y - 512)**2)
    # Subtle ambient emerald glow in center
    glow = np.clip(1.0 - (bg_dist / 512.0), 0.0, 1.0)**2.5
    bg_arr[:, :, 0] += glow * 10.0   # R
    bg_arr[:, :, 1] += glow * 45.0   # G
    bg_arr[:, :, 2] += glow * 35.0   # B
    bg_1024 = Image.fromarray(np.clip(bg_arr, 0, 255).astype(np.uint8))
    bg_1024.save('assets/images/android-icon-background.png', 'PNG')
    print("Saved assets/images/android-icon-background.png")

    # 4. Full Icon Composite: 1024x1024
    full_icon = bg_1024.copy()
    full_icon.paste(fg_1024, (0, 0), fg_1024)
    full_icon.save('assets/images/icon.png', 'PNG')
    full_icon.save('assets/icon.png', 'PNG')
    print("Saved assets/images/icon.png and assets/icon.png")

    # 5. Splash Screen Icon: 512x512 with transparent background
    splash = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    splash_disc = cropped_logo.resize((320, 320), Image.Resampling.LANCZOS)
    splash.paste(splash_disc, ((512 - 320) // 2, (512 - 320) // 2), splash_disc)
    splash.save('assets/images/splash-icon.png', 'PNG')
    splash.save('assets/splash-icon.png', 'PNG')
    print("Saved splash icons")

    # 6. Web Favicon: 48x48
    favicon = cropped_logo.resize((48, 48), Image.Resampling.LANCZOS)
    favicon.save('assets/images/favicon.png', 'PNG')
    if os.path.exists('dist'):
        favicon.save('dist/favicon.ico', format='ICO')
    print("Saved assets/images/favicon.png and dist/favicon.ico")

    # 7. Windows Multi-Size ICO: 256, 128, 64, 48, 32, 16
    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    cropped_logo.save('assets/images/loopd-icon.ico', format='ICO', sizes=ico_sizes)
    print("Saved assets/images/loopd-icon.ico (multi-resolution Windows icon)")

    # 8. Populate Android Res mipmap folders
    densities = {
        'mipmap-mdpi': (48, 108),
        'mipmap-hdpi': (72, 162),
        'mipmap-xhdpi': (96, 216),
        'mipmap-xxhdpi': (144, 324),
        'mipmap-xxxhdpi': (192, 432),
    }

    res_base = 'android/app/src/main/res'
    for folder, (launcher_sz, fg_sz) in densities.items():
        dir_path = os.path.join(res_base, folder)
        os.makedirs(dir_path, exist_ok=True)

        # Full launcher icon
        li = full_icon.resize((launcher_sz, launcher_sz), Image.Resampling.LANCZOS)
        li.save(os.path.join(dir_path, 'ic_launcher.png'), 'PNG')
        li.save(os.path.join(dir_path, 'ic_launcher_round.png'), 'PNG')

        # Background
        bi = bg_1024.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
        bi.save(os.path.join(dir_path, 'ic_launcher_background.png'), 'PNG')

        # Foreground (Adaptive)
        fi = fg_1024.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
        fi.save(os.path.join(dir_path, 'ic_launcher_foreground.png'), 'PNG')

        # Monochrome (Themed Icons Android 13+)
        mi = mono_1024.resize((fg_sz, fg_sz), Image.Resampling.LANCZOS)
        mi.save(os.path.join(dir_path, 'ic_launcher_monochrome.png'), 'PNG')

        print(f"Populated {folder}: launcher={launcher_sz}x{launcher_sz}, fg={fg_sz}x{fg_sz}")

    # Also update drawable splash if it exists
    drawable_splash = os.path.join(res_base, 'drawable', 'splashscreen_image.png')
    if os.path.exists(os.path.dirname(drawable_splash)):
        splash_disc.save(drawable_splash, 'PNG')
        print(f"Updated {drawable_splash}")

    # Generate Android 12+ SplashScreen animated icon across all densities
    splash_densities = {
        'drawable-mdpi': (288, 109),
        'drawable-hdpi': (432, 163),
        'drawable-xhdpi': (576, 217),
        'drawable-xxhdpi': (864, 326),
        'drawable-xxxhdpi': (1152, 433),
    }
    for folder, (canvas_sz, logo_sz) in splash_densities.items():
        dir_path = os.path.join(res_base, folder)
        os.makedirs(dir_path, exist_ok=True)
        splash_img = Image.new('RGBA', (canvas_sz, canvas_sz), (0, 0, 0, 0))
        scaled_logo = cropped_logo.resize((logo_sz, logo_sz), Image.Resampling.LANCZOS)
        offset = (canvas_sz - logo_sz) // 2
        splash_img.paste(scaled_logo, (offset, offset), scaled_logo)
        out_file = os.path.join(dir_path, 'splashscreen_logo.png')
        splash_img.save(out_file, 'PNG')
        print(f"Updated {out_file} (canvas={canvas_sz}x{canvas_sz}, logo={logo_sz}x{logo_sz})")

    print("All icons and splash screens successfully generated!")

if __name__ == '__main__':
    generate_all_icons()

