#!/usr/bin/env python3
"""Run the Croía's Faces batch through AUTOMATIC1111's API (inpaint, style-only prompts).

Start A1111 with the API enabled first:  webui-user.bat  with  set COMMANDLINE_ARGS=--api
Then:  python run_batch.py            (all 40 styles x 4 seeds)
       python run_batch.py --limit 3 --seeds 1   (quick test)

Standard library only, no pip installs needed.
"""
import argparse, base64, json, os, re, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
p = argparse.ArgumentParser()
p.add_argument('--url', default='http://127.0.0.1:7860')
p.add_argument('--image', default=os.path.join(HERE, '..', 'images', 'croia_00.jpg'))
p.add_argument('--mask', default=os.path.join(HERE, 'mask_whole_image.png'),
               help='mask_whole_image.png (Fiadh look) or mask_face_only.png (keep background)')
p.add_argument('--prompts', default=os.path.join(HERE, 'prompts_style_only.txt'))
p.add_argument('--negative', default='open eyes, eyeballs, pupils, iris, staring, adult, wrinkles, teeth, '
               'deformed, blurry, lowres, watermark, signature, text')
p.add_argument('--denoise', type=float, default=0.6)
p.add_argument('--seeds', type=int, default=4, help='images per style')
p.add_argument('--steps', type=int, default=30)
p.add_argument('--cfg', type=float, default=7)
p.add_argument('--size', type=int, default=1024, help='use 768 or 512 for SD 1.5 checkpoints')
p.add_argument('--sampler', default='DPM++ 2M Karras')
p.add_argument('--out', default=os.path.join(HERE, 'out'))
p.add_argument('--limit', type=int, default=0, help='only run the first N styles')
a = p.parse_args()

b64 = lambda path: base64.b64encode(open(path, 'rb').read()).decode()
init, mask = b64(a.image), b64(a.mask)
styles = [l.strip() for l in open(a.prompts, encoding='utf-8') if l.strip()]
if a.limit:
    styles = styles[:a.limit]
os.makedirs(a.out, exist_ok=True)

def post(payload):
    req = urllib.request.Request(a.url + '/sdapi/v1/img2img', json.dumps(payload).encode(),
                                 {'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=1800) as r:
        return json.load(r)

try:
    urllib.request.urlopen(a.url + '/sdapi/v1/sd-models', timeout=10)
except Exception as e:
    sys.exit(f'Cannot reach A1111 API at {a.url} ({e}). Is it running with --api?')

log = open(os.path.join(a.out, 'log.jsonl'), 'a', encoding='utf-8')
t0 = time.time()
for i, prompt in enumerate(styles, 1):
    slug = re.sub(r'[^a-z0-9]+', '-', prompt.split(',')[0].lower()).strip('-')[:40]
    res = post({
        'init_images': [init], 'mask': mask,
        'inpainting_fill': 1,          # masked content: original (keeps the layout)
        'inpaint_full_res': False,     # inpaint area: whole picture
        'inpainting_mask_invert': 0, 'mask_blur': 4,
        'denoising_strength': a.denoise, 'prompt': prompt, 'negative_prompt': a.negative,
        'steps': a.steps, 'cfg_scale': a.cfg, 'sampler_name': a.sampler,
        'width': a.size, 'height': a.size, 'seed': -1, 'batch_size': a.seeds,
    })
    info = json.loads(res.get('info', '{}'))
    for k, img in enumerate(res['images'][:a.seeds]):
        seed = info.get('all_seeds', [None] * a.seeds)[k]
        name = f'croia_{i:02d}_{slug}_{seed}.png'
        open(os.path.join(a.out, name), 'wb').write(base64.b64decode(img.split(',', 1)[-1]))
        log.write(json.dumps({'file': name, 'prompt': prompt, 'seed': seed, 'denoise': a.denoise}) + '\n')
    log.flush()
    print(f'[{i}/{len(styles)}] {slug}  ({time.time() - t0:.0f}s)')
print('done ->', a.out)
