from slg_photo_updater import upload_photo
import gdown
import re
import os
import json


def slugify(name):
    return name.lower().replace(".", "").replace(" ", "-")


with open("./data/simc-slg-2023-24-roster.csv") as fin:
    data = [line.split(",") for line in fin.read().strip().split("\n")[1:]]

imgbb_urls = {}

os.makedirs("./data/images", exist_ok=True)
for i, el in enumerate(data):
    name, gdrive_url = el
    print(f"[{str(i + 1).rjust(2)}/{len(data)}] Processing {name}...", end=" ")

    gdrive_id = re.match(
        "https:\/\/drive.google.com\/open\?id=(.+)", gdrive_url)[1]
    photo_path = f"./data/images/{slugify(name)}.png"

    # Already done?
    if os.path.exists(photo_path):
        print(f"Already done. Skipping...")
        continue

    gdown.download(
        f"https://drive.google.com/uc?id={gdrive_id}", photo_path, quiet=True)
    imgbb_urls[name] = upload_photo(photo_path, slugify(name))

    print(f"Done.")


with open(f"./data/slg.json", "w") as fout:
    json.dump([
        {
            "name": name,
            "photoURL": url
        }
        for name, url in imgbb_urls.items()], fout, indent=2)
