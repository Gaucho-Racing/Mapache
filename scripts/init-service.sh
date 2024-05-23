#!/bin/bash

read -p "Enter the name of the new service: " dir_name

if [ -z "$dir_name" ]; then
    echo "Service name cannot be empty."
    exit 1
fi

if [ -d "$dir_name" ]; then
    echo "Directory already exists. Please choose a different name."
    exit 1
fi

read -p "Creating service '$dir_name'. Do you want to proceed? [Y/n]: " confirm
if [[ $confirm == "Y" || $confirm == "y" ]]; then
    echo "Creating service..."
else
    echo "Operation cancelled."
    exit 0
fi

mkdir "$dir_name"
rsync -av --progress --exclude 'readme.md' --exclude 'README.md' silverstone/ "$dir_name"
echo "Service '$dir_name' created successfully."