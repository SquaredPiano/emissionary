#!/bin/bash
set -e
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Run the CLI tool with the provided arguments
python main.py "$@" 