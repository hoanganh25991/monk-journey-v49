#!/bin/bash

# Update padding in settings-menu.css
sed -i '' 's/padding: 8px 15px;/padding: calc(var(--padding-small) + 3px) var(--padding-medium);/g' css/settings-menu.css
sed -i '' 's/padding: 30px;/padding: var(--padding-large);/g' css/settings-menu.css
sed -i '' 's/padding: 15px 20px;/padding: var(--padding-medium) var(--padding-large);/g' css/settings-menu.css
sed -i '' 's/padding: 5px 10px;/padding: var(--padding-small) var(--padding-medium);/g' css/settings-menu.css
sed -i '' 's/padding: 5px 0;/padding: var(--padding-small) 0;/g' css/settings-menu.css
sed -i '' 's/padding: 10px 0;/padding: var(--padding-medium) 0;/g' css/settings-menu.css
sed -i '' 's/padding: 6px 12px;/padding: var(--padding-small) var(--padding-medium);/g' css/settings-menu.css

# Update padding in skill-preview.css
sed -i '' 's/padding: 5px 10px;/padding: var(--padding-small) var(--padding-medium);/g' css/skill-preview.css

# Update padding in game-menu.css
sed -i '' 's/padding: 15px 30px;/padding: var(--padding-medium) var(--padding-large);/g' css/game-menu.css
sed -i '' 's/padding: 12px 25px;/padding: var(--padding-medium) var(--padding-large);/g' css/game-menu.css
sed -i '' 's/padding: 8px 15px;/padding: calc(var(--padding-small) + 3px) var(--padding-medium);/g' css/game-menu.css

# Update padding in skill-selection.css
sed -i '' 's/padding: 15px 20px;/padding: var(--padding-medium) var(--padding-large);/g' css/skill-selection.css
sed -i '' 's/padding: 0 30px;/padding: 0 var(--padding-large);/g' css/skill-selection.css
sed -i '' 's/padding: 15px 0;/padding: var(--padding-medium) 0;/g' css/skill-selection.css
sed -i '' 's/padding: 0 4px;/padding: 0 calc(var(--padding-small) - 1px);/g' css/skill-selection.css
sed -i '' 's/padding: 2px 4px;/padding: calc(var(--padding-small) - 3px) calc(var(--padding-small) - 1px);/g' css/skill-selection.css

# Update padding in hud-manager.css
sed -i '' 's/padding: 10px 20px;/padding: var(--padding-medium) var(--padding-large);/g' css/hud-manager.css
sed -i '' 's/padding: 20px;/padding: var(--padding-large);/g' css/hud-manager.css

# Don't update padding: 0; as it's a reset value

echo "Remaining padding values updated to use CSS variables"