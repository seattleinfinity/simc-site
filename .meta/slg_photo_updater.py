import os
from dotenv import load_dotenv
import requests
from base64 import b64encode
import json
import time

load_dotenv()


def upload_photo(photo_path: str, name: str) -> str:
    """
    Given a photo path, uploads to imgbb and returns the image URL.
    """
    url = "https://api.imgbb.com/1/upload"
    key = os.environ["IMGBB_KEY"]

    res = requests.post(
        url,
        data={
            "key": key,
            "image": b64encode(open(photo_path, "rb").read()),
            "name": f"{name}.png",
        }
    )

    return res.json()["data"]["url"]


if __name__ == "__main__":
    # This is very specific to my computer and could be made to use Google APIs but I'm too lazy
    # (This relies on the Google Drive app)
    photo_dir = r"H:\.shortcut-targets-by-id\1kjbcA9ofjEee8GqJyZfJwrDkq-uHXoGM\Website\assets\SLG photos [small]"

    datafile_dir = "../src/_data/slg.json"

    # Read data, process, etc.
    with open(datafile_dir) as fin:
        slg_data = json.load(fin)

    print(f"{len(slg_data)} photos to process")

    for i, person in enumerate(slg_data):
        name = person["name"]
        photo_path = os.path.join(photo_dir, f"{name}.png")

        start_time = time.time()
        slg_data[i]["photoURL"] = upload_photo(photo_path, name)

        print(
            f"[{i}] Uploaded photo of {name.ljust(32)} {round(time.time() - start_time, 2)}s")

    with open(datafile_dir, "w") as fout:
        json.dump(slg_data, fout, indent=2)
