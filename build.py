# -*- coding: utf-8 -*-
"""
build.py — 移动优先性能构建
1. 浪尖.jpg -> 浪尖.webp（Pillow，质量 82）
2. 27 个 JS 按 index.html 加载顺序合并 + 压缩 -> js/game.bundle.min.js
3. style.css 压缩 -> 内联进 <style id="game-css">
4. index.html 重写：
   - 移除 Google Fonts 外部依赖（本地字体栈兜底）
   - <picture> WebP + 懒加载
   - 单个 <script defer src="js/game.bundle.min.js">
   - theme-color / viewport-fit=cover
可重复执行（幂等）。源码仍是 src/ 与 style.css，改完源码重跑本脚本。
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

# ---------- 0. 依赖 ----------
try:
    import rjsmin
    import rcssmin
except ImportError:
    print('缺少 rjsmin/rcssmin：python -m pip install rjsmin rcssmin')
    sys.exit(1)

# ---------- 1. WebP 转换 ----------
def build_webp():
    try:
        from PIL import Image
    except ImportError:
        print('[warn] 未安装 Pillow，跳过 WebP 转换（继续用 JPG）')
        return False
    src, dst = '浪尖.jpg', '浪尖.webp'
    if not os.path.exists(src):
        print('[warn] 找不到 浪尖.jpg，跳过')
        return False
    need = True
    if os.path.exists(dst):
        need = os.path.getmtime(dst) < os.path.getmtime(src)
    if need:
        img = Image.open(src)
        img.save(dst, 'WEBP', quality=82, method=6)
        print('[webp] %s -> %s  (%d B -> %d B)' % (src, dst, os.path.getsize(src), os.path.getsize(dst)))
    else:
        print('[webp] 浪尖.webp 已是最新')
    return True

has_webp = build_webp()

# ---------- 2. JS 合并压缩 ----------
JS_ORDER = [
    # 全局命名空间（内联脚本，等效 prepend）
    'src/core/Utils.js',
    'src/data/balance.js',
    'src/data/waves.js',
    'src/data/bosses.js',
    'src/data/planes.js',
    'src/data/shop.js',
    'src/core/Input.js',
    'src/entities/Entity.js',
    'src/entities/Projectile.js',
    'src/entities/Option.js',
    'src/entities/Player.js',
    'src/entities/Enemy.js',
    'src/entities/Boss.js',
    'src/entities/Pickup.js',
    'src/systems/ParticleSystem.js',
    'src/systems/AudioSystem.js',
    'src/systems/ScoreSystem.js',
    'src/systems/Collision.js',
    'src/systems/Spawner.js',
    'src/systems/SpawnerEndless.js',
    'src/systems/SaveSystem.js',
    'src/systems/ProgressSystem.js',
    'src/systems/Stats.js',
    'src/systems/Achievements.js',
    'src/render/Background.js',
    'src/render/Effects.js',
    'src/render/Renderer.js',
    'src/ui/HUD.js',
    'src/ui/BossUI.js',
    'src/ui/Menu.js',
    'src/core/Game.js',
    'src/main.js',
]

def build_js():
    parts = ['window.GAME=window.GAME||{};']
    total_raw = 0
    for path in JS_ORDER:
        raw = io.open(path, 'r', encoding='utf-8').read()
        total_raw += len(raw.encode('utf-8'))
        parts.append('/* %s */' % os.path.basename(path))
        parts.append(rjsmin.jsmin(raw))
    bundle = '\n'.join(parts)
    os.makedirs('js', exist_ok=True)
    out = 'js/game.bundle.min.js'
    io.open(out, 'w', encoding='utf-8').write(bundle)
    size = os.path.getsize(out)
    print('[js] %d 个文件 -> %s  (%.1f KB raw -> %.1f KB min)' % (len(JS_ORDER), out, total_raw/1024, size/1024))
    return out

# ---------- 3. CSS 压缩 ----------
def build_css():
    raw = io.open('style.css', 'r', encoding='utf-8').read()
    css = rcssmin.cssmin(raw)
    print('[css] style.css -> 内联 (%.1f KB -> %.1f KB)' % (len(raw.encode('utf-8'))/1024, len(css.encode('utf-8'))/1024))
    return css

# ---------- 4. index.html 重写（幂等） ----------
def build_html(css, js_path):
    html = io.open('index.html', 'r', encoding='utf-8').read()

    # 4.1 viewport 升级
    html = re.sub(
        r'<meta name="viewport"[^>]*/>',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />',
        html)
    # 4.2 theme-color（插在 viewport 后）
    if 'theme-color' not in html:
        html = html.replace(
            '<title>',
            '<meta name="theme-color" content="#05060f" />\n  <meta name="mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n  <title>')

    # 4.3 移除 Google Fonts 外部依赖（3 行）
    html = re.sub(r'\s*<link rel="preconnect"[^>]*/>', '', html)
    html = re.sub(r'\s*<link href="https://fonts\.googleapis\.com[^>]*/>', '', html)

    # 4.4 CSS 内联（幂等：替换旧的 style#game-css 或 stylesheet link）
    style_tag = '<style id="game-css">%s</style>' % css
    if 'game-css' in html:
        html = re.sub(r'<style id="game-css">[\s\S]*?</style>', style_tag, html)
    else:
        html = re.sub(r'<link rel="stylesheet" href="style\.css" />', style_tag, html)

    # 4.5 图片 WebP + 懒加载（幂等）
    if has_webp:
        pic = ('<picture id="langjian-pic">'
               '<source srcset="浪尖.webp" type="image/webp" />'
               '<img src="浪尖.jpg" alt="浪尖" loading="lazy" decoding="async" draggable="false" />'
               '</picture>')
        if 'langjian-pic' not in html:
            html = re.sub(r'<img src="浪尖\.jpg"[^>]*/>', pic, html)

    # 4.6 脚本合并（幂等：从第一个 <script 到 </body> 前全部替换为单个 defer bundle）
    bundle_tag = '<script defer src="%s"></script>\n</body>' % js_path
    html = re.sub(r'<!-- 全局命名空间 -->[\s\S]*?<script src="src/main\.js"></script>\s*</body>', bundle_tag, html)
    if 'game.bundle.min.js' not in html:
        # 兜底：任意脚本块
        html = re.sub(r'<script[\s\S]*?</script>\s*</body>', bundle_tag, html)

    io.open('index.html', 'w', encoding='utf-8').write(html)
    print('[html] index.html 已重写：内联 CSS + defer 单 bundle%s' % (' + WebP 懒加载' if has_webp else ''))

if __name__ == '__main__':
    js_path = build_js()
    css = build_css()
    build_html(css, js_path)
    print('[done] 构建完成。修改 src/ 或 style.css 后重新运行本脚本即可。')
