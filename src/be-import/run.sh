#!/bin/bash
virtualenv venv
source "$(pwd)/venv/bin/activate"
pip install -r requirements.txt
export NODE_ENV=development
python app.py

