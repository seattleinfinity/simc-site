# Meta stuff

This directory contains some utility scripts and whatnot for constructing the main site.

Dependencies:

1. [`dotenv`](https://github.com/theskumar/python-dotenv) for environment variable reading (secret keys etc.)
2. [`gdown`](https://github.com/wkentaro/gdown) for downloading things from google drive urls

## Scripts

See the scripts themselves for details.

### SLG photo updater (`./slg_photo_updater.py`)

Automatically reads in a directory with photos of the SLG members and updates the `slg.json` Eleventy data file.

### SLG photo downloader (`./slg_photo_downloader.py`)

Reads in a csv file of google drive urls for images, downloads these images, and re-uploads them to imgbb for image hosting.

## Notes

These should probably be written in JS for reusability with Eleventy, but it's faster for me to write them in Python. When I get more time I might rewrite them in
