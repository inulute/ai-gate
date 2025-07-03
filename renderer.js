// renderer.js

let openTabs = []; // Array to keep track of open tabs in order

function requestNewTab(toolName) {
  window.electronAPI.requestNewTab(toolName);
}

function changeLayout(layout) {
  window.electronAPI.changeLayout(layout);
}

// Keep track of the current layout
let currentLayout = '1x1';

// Handle creation of a new tab (also used for full-screen mode)
window.electronAPI.onCreateNewTab((toolName) => {
  // Create a new webview
  const webview = document.createElement('webview');
  webview.src = getToolUrl(toolName);
  webview.style.width = '100%';
  webview.style.height = '100%';
  webview.style.flexGrow = '1';
  webview.setAttribute('allowpopups', 'true'); // Allow popups if needed

  // Create a loading spinner
  const loader = document.createElement('div');
  loader.className = 'loader';

  // Show loader when webview starts loading
  webview.addEventListener('did-start-loading', () => {
    loader.style.display = 'block';
  });

  // Hide loader when webview finishes loading
  webview.addEventListener('did-stop-loading', () => {
    loader.style.display = 'none';
  });

  // Add the new tab to openTabs
  openTabs.push({ toolName, webview, loader });

  // Update the layout to display the tabs
  renderLayout(currentLayout);
});

// Handle layout changes
window.electronAPI.onUpdateLayout((layout) => {
  currentLayout = layout;
  renderLayout(layout);
});

// Function to render the layout and assign tabs to cells
function renderLayout(layout) {
  const tabsContainer = document.getElementById('tabs-container');

  // Update the grid template based on the layout
  let rows, cols;
  switch (layout) {
    case '1x1':
      rows = 1;
      cols = 1;
      break;
    case '2x1':
      rows = 1;
      cols = 2;
      break;
    case '3x1':
      rows = 1;
      cols = 3;
      break;
    case '2x2':
      rows = 2;
      cols = 2;
      break;
    default:
      rows = 1;
      cols = 1;
  }

  const cellCount = rows * cols;

  // Set the grid properties
  tabsContainer.style.display = 'grid';
  tabsContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  tabsContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  tabsContainer.style.gap = '15px';
  tabsContainer.style.width = '100%';
  tabsContainer.style.height = '100%';

  // Remove excess cells if any
  while (tabsContainer.children.length > cellCount) {
    tabsContainer.removeChild(tabsContainer.lastChild);
  }

  // Create or update cells
  for (let i = 0; i < cellCount; i++) {
    let cell = tabsContainer.children[i];
    if (!cell) {
      // Create a new cell
      cell = document.createElement('div');
      cell.className = 'tab-cell';
      cell.style.display = 'flex';
      cell.style.flexDirection = 'column';

      const header = document.createElement('div');
      header.className = 'tab-cell-header';

      const toolSelect = document.createElement('select');
      toolSelect.innerHTML = `
        <option value="">Select Tool</option>
        <option value="chatgpt">ChatGPT</option>
        <option value="claude">Claude</option>
        <option value="perplexity">Perplexity AI</option>
        <option value="perplexity-labs">Perplexity Labs</option>
        <option value="gemini">Gemini</option>
      `;
      toolSelect.onchange = () => {
        loadToolInCell(i, toolSelect.value);
      };

      header.appendChild(toolSelect);
      cell.appendChild(header);

      const webviewContainer = document.createElement('div');
      webviewContainer.className = 'webview-container';
      webviewContainer.style.flexGrow = '1';
      webviewContainer.style.width = '100%';
      webviewContainer.style.height = '100%';
      webviewContainer.style.position = 'relative';

      cell.appendChild(webviewContainer);
      tabsContainer.appendChild(cell);
    }

    // Update the cell with the existing tab if available
    const webviewContainer = cell.querySelector('.webview-container');
    const toolSelect = cell.querySelector('select');

    if (openTabs[i]) {
      if (!webviewContainer.contains(openTabs[i].webview)) {
        // Append the webview and loader if not already present
        webviewContainer.appendChild(openTabs[i].webview);
        webviewContainer.appendChild(openTabs[i].loader);
      }
      toolSelect.value = openTabs[i].toolName;
      openTabs[i].cellIndex = i; // Keep track of the cell index
    } else {
      // Clear the webviewContainer if no tab is assigned
      webviewContainer.innerHTML = '';
      toolSelect.value = '';
    }
  }
}

// Function to load a tool into a specific cell
function loadToolInCell(cellIndex, toolName) {
  if (!toolName) return;

  let tab = openTabs.find(tab => tab.cellIndex === cellIndex);

  if (tab) {
    // Update the existing tab
    tab.toolName = toolName;
    tab.webview.src = getToolUrl(toolName);
  } else {
    // Create a new webview
    const webview = document.createElement('webview');
    webview.src = getToolUrl(toolName);
    webview.style.width = '100%';
    webview.style.height = '100%';
    webview.style.flexGrow = '1';
    webview.setAttribute('allowpopups', 'true');

    // Create a loading spinner
    const loader = document.createElement('div');
    loader.className = 'loader';

    // Show loader when webview starts loading
    webview.addEventListener('did-start-loading', () => {
      loader.style.display = 'block';
    });

    // Hide loader when webview finishes loading
    webview.addEventListener('did-stop-loading', () => {
      loader.style.display = 'none';
    });

    // Assign the new tab to openTabs at the correct index
    openTabs[cellIndex] = { toolName, webview, loader, cellIndex };

    // Find the corresponding cell and append the webview and loader
    const cell = document.getElementById('tabs-container').children[cellIndex];
    const webviewContainer = cell.querySelector('.webview-container');
    webviewContainer.appendChild(webview);
    webviewContainer.appendChild(loader);
  }
}

// Function to get the URL of a tool based on its name
function getToolUrl(toolName) {
  switch (toolName) {
    case 'chatgpt':
      return 'https://chat.openai.com/';
    case 'claude':
      return 'https://claude.ai/';
    case 'perplexity':
      return 'https://perplexity.ai/';
    case 'perplexity-labs':
      return 'https://labs.perplexity.ai/';
    case 'gemini':
      return 'https://gemini.google.com/'; // Placeholder URL; replace with actual URL when available
    default:
      return 'about:blank';
  }
}
