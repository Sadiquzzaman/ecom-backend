#!/bin/bash

# echo "setup python env"
# echo "done"

virtualenv env
source "$(pwd)/env/bin/activate"
pip install Flask
pip install waitress

