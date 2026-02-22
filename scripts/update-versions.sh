#!/bin/bash

# Find all package.json files inside packages/, excluding node_modules
PACKAGE_FILES=$(find packages -name "package.json" -not -path "*/node_modules/*")

if [ -z "$PACKAGE_FILES" ]; then
  echo "No package.json files found in packages/."
  exit 0
fi

# Use Node.js for the interactive menu (Arrow keys support)
# We use stderr for the UI so we can capture the selection from stdout
BUMP_TYPE=$(node -e '
const readline = require("readline");
const { stdin, stderr } = process;

const options = ["PATCH", "MINOR", "MAJOR"];
let index = 0;

// Prepare UI area
stderr.write("\n".repeat(options.length + 1));

function render() {
  readline.moveCursor(stderr, 0, -(options.length + 1));
  readline.clearScreenDown(stderr);
  
  stderr.write("Select version bump type (Use arrow keys, Enter to select):\n");
  options.forEach((opt, i) => {
    if (i === index) {
      stderr.write(`\x1b[36m> ${opt}\x1b[0m\n`); // Cyan color for selected
    } else {
      stderr.write(`  ${opt}\n`);
    }
  });
}

readline.emitKeypressEvents(stdin);
if (stdin.isTTY) stdin.setRawMode(true);

render();

stdin.on("keypress", (str, key) => {
  if (!key) return;
  
  if (key.ctrl && key.name === "c") {
    process.exit(1); // Exit with error
  } else if (key.name === "up") {
    index = (index - 1 + options.length) % options.length;
    render();
  } else if (key.name === "down") {
    index = (index + 1) % options.length;
    render();
  } else if (key.name === "return") {
    if (stdin.isTTY) stdin.setRawMode(false);
    console.log(options[index]); // Print selection to stdout
    process.exit(0);
  }
});
')

# Check if user cancelled
if [ $? -ne 0 ]; then
  echo "Operation cancelled."
  exit 1
fi

# Trim any whitespace
BUMP_TYPE=$(echo "$BUMP_TYPE" | xargs)

echo "Updating versions to $BUMP_TYPE..."

# Iterate and update using a safe node script invocation
for FILE in $PACKAGE_FILES; do
  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const type = process.argv[2];
    
    try {
      const content = fs.readFileSync(file, "utf8");
      const pkg = JSON.parse(content);
      
      if (!pkg.version) {
        // Silently skip or log if needed
        process.exit(0);
      }
      
      const oldVer = pkg.version;
      const parts = oldVer.split(".").map(Number);
      
      if (parts.length !== 3 || parts.some(isNaN)) {
        console.log(`Skipping ${pkg.name}: Invalid version format ${oldVer}`);
        process.exit(0);
      }
      
      if (type === "PATCH") {
        parts[2]++;
      } else if (type === "MINOR") {
        parts[1]++;
        parts[2] = 0;
      } else if (type === "MAJOR") {
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
      }
      
      const newVer = parts.join(".");
      pkg.version = newVer;
      
      // Write with newline at end
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
      console.log(`Updated ${pkg.name || file}: ${oldVer} -> ${newVer}`);
    } catch (e) {
      console.error(`Error updating ${file}: ${e.message}`);
      process.exit(1);
    }
  ' "$FILE" "$BUMP_TYPE"
done

echo "All packages updated successfully."
