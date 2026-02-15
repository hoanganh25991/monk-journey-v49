#!/bin/bash

# Update padding in skill-tree.css
sed -i '' 's/padding: 15px 20px;/padding: var(--padding-medium) var(--padding-large);/g' css/skill-tree.css
sed -i '' 's/padding: 20px;/padding: var(--padding-large);/g' css/skill-tree.css
sed -i '' 's/padding: 10px;/padding: var(--padding-medium);/g' css/skill-tree.css
sed -i '' 's/padding: 15px;/padding: var(--padding-medium);/g' css/skill-tree.css
sed -i '' 's/padding-bottom: 15px;/padding-bottom: var(--padding-medium);/g' css/skill-tree.css
sed -i '' 's/padding-bottom: 5px;/padding-bottom: var(--padding-small);/g' css/skill-tree.css
sed -i '' 's/padding: 3px 8px;/padding: var(--padding-small) calc(var(--padding-small) + 3px);/g' css/skill-tree.css
sed -i '' 's/padding: 8px 12px;/padding: calc(var(--padding-small) + 3px) var(--padding-medium);/g' css/skill-tree.css

# Update padding in notifications.css
sed -i '' 's/padding: 6px 12px;/padding: var(--padding-small) var(--padding-medium);/g' css/notifications.css

# Update padding in hud-manager.css
sed -i '' 's/padding: 10px;/padding: var(--padding-medium);/g' css/hud-manager.css
sed -i '' 's/padding: 8px 0;/padding: calc(var(--padding-small) + 3px) 0;/g' css/hud-manager.css
sed -i '' 's/padding: 2px 4px;/padding: calc(var(--padding-small) - 3px) calc(var(--padding-small) - 1px);/g' css/hud-manager.css

# Update padding in game-menu.css
sed -i '' 's/padding: 10px;/padding: var(--padding-medium);/g' css/game-menu.css
sed -i '' 's/padding: 15px;/padding: var(--padding-medium);/g' css/game-menu.css
sed -i '' 's/padding: 20px;/padding: var(--padding-large);/g' css/game-menu.css
sed -i '' 's/padding: 5px;/padding: var(--padding-small);/g' css/game-menu.css

# Update padding in settings-menu.css
sed -i '' 's/padding: 10px;/padding: var(--padding-medium);/g' css/settings-menu.css
sed -i '' 's/padding: 15px;/padding: var(--padding-medium);/g' css/settings-menu.css
sed -i '' 's/padding: 20px;/padding: var(--padding-large);/g' css/settings-menu.css
sed -i '' 's/padding: 5px;/padding: var(--padding-small);/g' css/settings-menu.css

# Update padding in skill-preview.css
sed -i '' 's/padding: 10px;/padding: var(--padding-medium);/g' css/skill-preview.css
sed -i '' 's/padding: 15px;/padding: var(--padding-medium);/g' css/skill-preview.css
sed -i '' 's/padding: 5px;/padding: var(--padding-small);/g' css/skill-preview.css

# Update padding in skill-selection.css
sed -i '' 's/padding: 10px;/padding: var(--padding-medium);/g' css/skill-selection.css
sed -i '' 's/padding: 15px;/padding: var(--padding-medium);/g' css/skill-selection.css
sed -i '' 's/padding: 5px;/padding: var(--padding-small);/g' css/skill-selection.css

# Update padding in orientation-message.css
sed -i '' 's/padding: 10px;/padding: var(--padding-medium);/g' css/orientation-message.css
sed -i '' 's/padding: 15px;/padding: var(--padding-medium);/g' css/orientation-message.css
sed -i '' 's/padding: 20px;/padding: var(--padding-large);/g' css/orientation-message.css
sed -i '' 's/padding: 5px;/padding: var(--padding-small);/g' css/orientation-message.css

echo "Padding values updated to use CSS variables"