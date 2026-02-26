#!/bin/bash

# This script adds legend support to HOC components that have colorBy but no legend
# Usage: bash scripts/add-legend-to-hocs.sh

echo "Adding legend support to HOC components..."

# List of files to update
FILES=(
  "src/components/charts/ordinal/BarChart.tsx"
  "src/components/charts/ordinal/BoxPlot.tsx"
  "src/components/charts/ordinal/DotPlot.tsx"
  "src/components/charts/ordinal/SwarmPlot.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Check if createLegend import already exists
    if ! grep -q "createLegend" "$file"; then
      # Add import
      sed -i '' '/import { getColor.*colorUtils/s/$/\nimport { createLegend } from "..\/shared\/legendUtils"/' "$file"
      echo "  ✓ Added createLegend import"
    fi

    # Check if showLegend prop already exists
    if ! grep -q "showLegend\?" "$file"; then
      # Add showLegend prop before tooltip
      sed -i '' '/tooltip\?: TooltipProp/i\
  /**\
   * Show legend\
   * @default true (when colorBy is specified)\
   *\/\
  showLegend\?: boolean\
\

' "$file"
      echo "  ✓ Added showLegend prop to interface"
    fi

    echo "  Note: Manual steps still needed for $file:"
    echo "    1. Add showLegend to props destructuring"
    echo "    2. Add legend computation before frameProps"
    echo "    3. Add legend to frame props"
  else
    echo "  ✗ File not found: $file"
  fi
done

echo ""
echo "✓ Import additions complete"
echo "⚠️  Manual implementation still required - see notes above"
