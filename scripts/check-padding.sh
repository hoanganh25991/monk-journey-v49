#!/bin/bash

echo "Checking for remaining hardcoded padding values..."
echo "=================================================="

# Find all CSS files with padding that doesn't use var(--padding)
grep -r "padding:" --include="*.css" css/ | grep -v "var(--padding" | grep -v "utilities.css" | grep -v "variables.css"

echo ""
echo "=================================================="
echo "If any results appear above, they may need to be updated to use CSS variables."
echo "You can update them manually or add them to the update-padding.sh script."