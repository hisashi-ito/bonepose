"""Reproduces docs/gallery.png. Generate images from bonepose skeletons with WAI-illustrious (SDXL) + xinsir OpenPose ControlNet.
Settings mirror the Draw Things fork docs: 1024x1024, 25 steps, CFG 6, Euler a, seed 777,
ControlNet weight 1.0 applied for the first 60% of the steps."""
import sys, json, torch
from PIL import Image
from diffusers import StableDiffusionXLControlNetPipeline, ControlNetModel, EulerAncestralDiscreteScheduler
from pathlib import Path

HOME = Path.home()
WAI = HOME / "models/sdxl/wai/waiIllustriousSDXL_v160.safetensors"
CN = HOME / "models/sdxl/xinsir-openpose"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")   # directory holding skel_<name>.png exported from bonepose
BASE = "masterpiece, best quality, amazing quality, {subj}, medium hair, brown hair, brown eyes, serafuku, school uniform, {pose}, smile, looking at viewer, full body, simple background"
NEG = "bad quality, worst quality, worst detail, sketch, censor, nsfw, bad anatomy, bad hands, extra digits, deformed, ugly"
JOBS = {
    "stand": ("1girl, solo", "standing, arms at sides"),
    "tpose": ("1girl, solo", "standing, arms spread"),
    "peace": ("1girl, solo", "standing, v, hand on hip, smug"),
    "cheek": ("1girl, solo", "standing, hand on own cheek, hand on hip"),
    "wave":  ("1girl, solo", "standing, waving, arm up"),
    "run":   ("1girl, solo", "running, dynamic pose"),
    "sit":   ("1girl, solo", "sitting, knees together"),
    "duo":   ("2girls", "standing, v, hand on hip, waving, arm up, side by side"),
}
controlnet = ControlNetModel.from_pretrained(str(CN), torch_dtype=torch.float16)
pipe = StableDiffusionXLControlNetPipeline.from_single_file(str(WAI), controlnet=controlnet, torch_dtype=torch.float16)
pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(pipe.scheduler.config)
pipe.to("cuda")
names = sys.argv[2:] or list(JOBS)
for name in names:
    subj, pose = JOBS[name]
    skel = Image.open(OUT / f"skel_{name}.png").convert("RGB")
    g = torch.Generator("cuda").manual_seed(777)
    img = pipe(prompt=BASE.format(subj=subj, pose=pose), negative_prompt=NEG, image=skel, controlnet_conditioning_scale=1.0,
               control_guidance_end=0.6, num_inference_steps=25, guidance_scale=6.0, width=1024, height=1024, generator=g).images[0]
    img.save(OUT / f"gen_{name}.png"); print("saved", name, flush=True)
