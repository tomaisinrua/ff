import os
import json

# Specify the images directory
images_dir = 'images'

# List all files in the images directory
images = [f for f in os.listdir(images_dir) if os.path.isfile(os.path.join(images_dir, f))]

# Filter out only image files (you can adjust the extensions as needed)
image_extensions = ('.jpg', '.jpeg', '.png', '.gif')
images = [f for f in images if f.lower().endswith(image_extensions)]

# Write the list to images.json
with open('images.json', 'w') as json_file:
    json.dump(images, json_file)
