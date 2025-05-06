// Global variables
let selectedImages = []; // Array to store the files of the selected images
let userText = ''; // String to store the text input by the user, or data for the barcode
let selectedPosition = null; // String to store the selected position for the text/barcode stamp (e.g., 'top-left')
let processedImages = []; // Array to store objects of processed images { name: string, dataUrl: string }
let currentFontSize = 24; // Number: Default and current font size for text stamps or the value displayed with a barcode
let currentTextPadding = 10; // Number: Default and current padding around the text or barcode element
let isBarcodeEnabled = false; // Boolean: Tracks if barcode mode is active
let currentBarcodeWidthPercentage = 20; // ADDED: Default and current barcode width as a percentage of image width
// let currentBarcodeValueFontSize = 16; // REMOVED/DEPRECATED: Font size for text under barcode is now controlled by currentFontSize

// Constants
const STAMP_CORNER_RADIUS = 8; // ADDED: Define the corner radius for the stamp background. Adjust for more/less roundness.

// DOM Elements - References to HTML elements used for interaction and display
const imageInput = document.getElementById('image-input'); // Input element for selecting image files
const textInput = document.getElementById('text-input'); // Input element for the user to enter text/data
const imageCountEl = document.getElementById('image-count'); // Element to display the count of selected images
const textInputStatusEl = document.getElementById('text-input-status'); // Element to display status/feedback for the text input
const positionButtons = document.querySelectorAll('.position-button'); // NodeList of all position selection buttons
const positionValueEl = document.getElementById('position-value'); // Element to display the currently selected position
const fontSizeInput = document.getElementById('font-size-input'); // Input element for setting the font size
const textPaddingInput = document.getElementById('text-padding-input'); // Input element for setting padding around the stamp

// DOM element for the main font size input's label (to dynamically change its text)
const fontSizeInputLabel = document.getElementById('font-size-input-label'); // Ensure this ID is on the <label> in HTML

// ADDED: DOM element for barcode value font size (now hidden and superseded by fontSizeInput)
const barcodeValueFontSizeInput = document.getElementById('barcode-value-font-size-input'); // Input for dedicated barcode font size (if it exists in HTML)
const barcodeValueFontSizeGroup = document.getElementById('barcode-value-font-size-group'); // Container for the dedicated barcode font size input

// ADDED: Barcode width slider control DOM elements
const barcodeWidthSlider = document.getElementById('barcode-width-slider'); // Range input for barcode width percentage
const barcodeWidthValueDisplay = document.getElementById('barcode-width-value-display'); // Span to show the current barcode width percentage
const barcodeWidthSliderGroup = document.getElementById('barcode-width-slider-group'); // Container for the barcode width slider (for visibility control)

const previewCanvas = document.getElementById('preview-canvas'); // Canvas element for showing a preview of the stamp on an image
const processButton = document.getElementById('process-button'); // Button to start processing the selected images
const downloadAllCheckbox = document.getElementById('download-all-checkbox'); // Checkbox to enable/disable downloading all images as a ZIP
const progressContainer = document.querySelector('.progress-container'); // Container for the progress bar and text
const progressBar = document.getElementById('progress-bar'); // Progress bar element
const progressTextEl = document.getElementById('progress-text'); // Element to display text updates during processing
const gallery = document.getElementById('gallery'); // Container to display processed image thumbnails
const resetButton = document.getElementById('reset-button'); // Button to reset the application state

const barcodeCheckbox = document.getElementById('barcode-checkbox'); // Checkbox to toggle barcode mode
const barcodeStatusEl = document.getElementById('barcode-status'); // Element to display status related to barcode mode

// --- Functions ---

/**
 * Handles the selection of image files by the user.
 * Updates the `selectedImages` array and the image count display.
 * Loads the first selected image for preview.
 * @param {Event} e - The file input change event.
 */
function handleImageSelection(e) {
    selectedImages = Array.from(e.target.files); // Convert FileList to Array
    imageCountEl.textContent = `Selected ${selectedImages.length} image(s)`; // Update UI with count
    if (selectedImages.length > 0) {
        loadImageForPreview(selectedImages[0]); // Load the first image for preview
    } else {
        previewCanvas.style.display = 'none'; // Hide preview if no images selected
        if (previewCanvas.loadedImageObject) previewCanvas.loadedImageObject = null; // Clear cached preview image
    }
    checkIfReadyToProcess(); // Check if the process button should be enabled
}

/**
 * Handles changes in the text input field.
 * Updates the `userText` variable and the text input status display.
 * Triggers a preview update.
 * @param {Event} e - The text input event.
 */
function handleTextChange(e) {
    userText = e.target.value.trim(); // Get and trim the input text
    if (userText) {
        textInputStatusEl.textContent = `Data to use: "${userText}"`; // Update status
    } else {
        textInputStatusEl.textContent = 'No data entered.'; // Update status for empty input
    }
    updatePreview(); // Refresh the preview canvas
    checkIfReadyToProcess(); // Check if the process button should be enabled
}

/**
 * Handles the selection of a text/barcode stamp position.
 * Updates the `selectedPosition` variable and highlights the selected button.
 * Triggers a preview update.
 */
function handlePositionSelection() {
    positionButtons.forEach(btn => btn.classList.remove('selected')); // Deselect all position buttons
    this.classList.add('selected'); // Select the clicked button
    selectedPosition = this.getAttribute('data-position'); // Get the position from data-attribute
    // Make the position string more user-friendly for display
    const friendlyPosition = selectedPosition.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    positionValueEl.textContent = `Selected Position: ${friendlyPosition}`; // Update UI with selected position
    updatePreview(); // Refresh the preview canvas
    checkIfReadyToProcess(); // Check if the process button should be enabled
}

/**
 * Handles changes in the font size input.
 * Updates `currentFontSize`, validates the value, and refreshes the preview.
 * @param {Event} e - The font size input change event.
 */
function handleFontSizeChange(e) {
    currentFontSize = parseInt(e.target.value, 10); // Parse font size to integer
    // Validate font size within min/max bounds
    if (isNaN(currentFontSize) || currentFontSize < 10) currentFontSize = 10;
    if (currentFontSize > 100) currentFontSize = 100;
    e.target.value = currentFontSize; // Update input field to reflect validated value
    updatePreview(); // Refresh the preview canvas
}

/**
 * Handles changes in the text padding input.
 * Updates `currentTextPadding`, validates the value, and refreshes the preview.
 * @param {Event} e - The padding input change event.
 */
function handleTextPaddingChange(e) {
    currentTextPadding = parseInt(e.target.value, 10); // Parse padding to integer
    // Validate padding within min/max bounds
    if (isNaN(currentTextPadding) || currentTextPadding < 0) currentTextPadding = 0;
    if (currentTextPadding > 50) currentTextPadding = 50;
    e.target.value = currentTextPadding; // Update input field to reflect validated value
    updatePreview(); // Refresh the preview canvas
}

/**
 * ADDED: Handles changes in the barcode width slider.
 * Updates `currentBarcodeWidthPercentage` and the display of this value.
 * Refreshes the preview if barcode mode is enabled.
 * @param {Event} e - The input event from the slider.
 */
function handleBarcodeWidthSliderChange(e) {
    currentBarcodeWidthPercentage = parseInt(e.target.value, 10); // Parse width percentage
    if (barcodeWidthValueDisplay) {
        barcodeWidthValueDisplay.textContent = currentBarcodeWidthPercentage; // Update UI display
    }
    if (isBarcodeEnabled) { // Only update preview if barcode mode is active
        updatePreview(); // Refresh the preview canvas
    }
}


/**
 * ADDED: Handles changes in the barcode's displayed value font size input.
 * NOTE: This function is now largely superseded as `fontSizeInput` controls barcode text font size.
 * It's kept for potential future use if a dedicated input is re-introduced.
 * @param {Event} e - The change event from the input.
 */
function handleBarcodeValueFontSizeChange(e) {
    // currentBarcodeValueFontSize = parseInt(e.target.value, 10);
    // if (isNaN(currentBarcodeValueFontSize) || currentBarcodeValueFontSize < 8) currentBarcodeValueFontSize = 8;
    // if (currentBarcodeValueFontSize > 40) currentBarcodeValueFontSize = 40; // Adjust max as needed
    // e.target.value = currentBarcodeValueFontSize;
    // if (isBarcodeEnabled) {
    //     updatePreview();
    // }
}

/**
 * Handles changes in the barcode checkbox state.
 * Toggles barcode mode (`isBarcodeEnabled`), updates UI elements accordingly (e.g., disables/enables font size input,
 * shows/hides barcode width slider, updates font size label), and refreshes the preview.
 * @param {Event} e - The change event from the barcode checkbox.
 */
function handleBarcodeCheckboxChange(e) {
    isBarcodeEnabled = e.target.checked; // Update barcode mode state

    if (isBarcodeEnabled) {
        barcodeStatusEl.textContent = 'Barcode (CODE128) will be used.'; // Set status message
        if (fontSizeInput) {
            fontSizeInput.disabled = false; // Ensure main font size input is enabled
            // Update title to reflect it now also controls barcode value font size
            fontSizeInput.title = "Controls font size for the value displayed with the barcode, or for plain text.";
        }
        if (fontSizeInputLabel) { // If the label element exists
            // Update the label text to be more descriptive for barcode mode
            fontSizeInputLabel.textContent = "Font Size (px) (for barcode value / text):";
        }

        // Show and enable barcode width slider
        if (barcodeWidthSliderGroup) barcodeWidthSliderGroup.style.display = 'block';
        if (barcodeWidthSlider) barcodeWidthSlider.disabled = false;

        // ADDED: Hide and disable the dedicated barcode value font size input as it's superseded by the main one
        if (barcodeValueFontSizeGroup) barcodeValueFontSizeGroup.style.display = 'none';
        if (barcodeValueFontSizeInput) barcodeValueFontSizeInput.disabled = true;

    } else { // Barcode mode is disabled
        barcodeStatusEl.textContent = ''; // Clear barcode status message
        if (fontSizeInput) {
            fontSizeInput.disabled = false; // Main font size input remains enabled for text
            fontSizeInput.title = "Controls font size for plain text."; // Revert title
        }
        if (fontSizeInputLabel) { // If the label element exists
            // Revert the label text to its default for text-only mode
            fontSizeInputLabel.textContent = "Font Size (px) (for text only):";
        }

        // Hide and disable barcode width slider
        if (barcodeWidthSliderGroup) barcodeWidthSliderGroup.style.display = 'none';
        if (barcodeWidthSlider) barcodeWidthSlider.disabled = true;

        // ADDED: Ensure dedicated barcode value font size input remains hidden/disabled
        if (barcodeValueFontSizeGroup) barcodeValueFontSizeGroup.style.display = 'none';
        if (barcodeValueFontSizeInput) barcodeValueFontSizeInput.disabled = true;
    }
    updatePreview(); // Refresh the preview canvas to reflect changes
}


/**
 * Loads an image file for the preview canvas.
 * Reads the file as a Data URL, creates an Image object, and scales it for preview.
 * @param {File} file - The image file to load.
 */
function loadImageForPreview(file) {
    const reader = new FileReader(); // Create a FileReader to read the file content
    reader.onload = function(event) { // Called when file reading is complete
        const img = new Image(); // Create a new Image object
        img.onload = function() { // Called when the image data has been loaded
            let newWidth = img.width; // Original image width
            let newHeight = img.height; // Original image height
            const parentElement = previewCanvas.parentElement; // Get parent for responsive sizing
            // Determine max width for preview, fallback if parent has no clientWidth
            const maxWidth = parentElement && parentElement.clientWidth > 0 ? parentElement.clientWidth * 0.9 : 600;
            const maxHeight = 400; // Fixed max height for preview area

            // Scale image to fit within maxWidth, maintaining aspect ratio
            if (newWidth > maxWidth) {
                newHeight = (maxWidth / newWidth) * newHeight;
                newWidth = maxWidth;
            }
            // Further scale if height still exceeds maxHeight, maintaining aspect ratio
            if (newHeight > maxHeight) {
                newWidth = (maxHeight / newHeight) * newWidth;
                newHeight = maxHeight;
            }
            img.actualPreviewRenderWidth = newWidth; // Store calculated width for rendering on canvas
            previewCanvas.loadedImageObject = img; // Cache the loaded Image object on the canvas element
            updatePreview(); // Call updatePreview to draw with the new image
        };
        img.onerror = function() { // Called if there's an error loading the image
            console.error("Error loading image for preview.");
            previewCanvas.style.display = 'none'; // Hide preview canvas
            previewCanvas.loadedImageObject = null; // Clear cached image on error
        }
        img.src = event.target.result; // Set image source to the file's Data URL
    };
    reader.readAsDataURL(file); // Read the file as a Data URL
}

/**
 * Updates the preview canvas.
 * If no base image is loaded, it attempts to load one or hides the canvas.
 * Otherwise, it calls `drawPreviewCanvas` to redraw.
 */
function updatePreview() {
    const baseImage = previewCanvas.loadedImageObject; // Get the cached Image object

    if (!baseImage) { // If no image is currently loaded for preview
        // Attempt to load the first selected image if available and not already loaded
        if (selectedImages.length > 0 && !previewCanvas.loadedImageObject) {
            loadImageForPreview(selectedImages[0]);
        } else { // No images to load, or an error occurred
            previewCanvas.style.display = 'none'; // Hide the canvas
            const ctx = previewCanvas.getContext('2d');
            if (ctx) { // If context exists, clear it
                ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            }
        }
        return; // Exit if no base image
    }
    
    if (!previewCanvas.getContext) { // Check if canvas 2D context is supported/available
        console.error("Canvas context not available for preview.");
        previewCanvas.style.display = 'none'; // Hide canvas if context is missing
        return;
    }
    
    drawPreviewCanvas(baseImage); // Proceed to draw on the canvas
}

/**
 * Draws the base image and the text/barcode stamp onto the preview canvas.
 * @param {Image} baseImage - The loaded Image object to use as the background.
 */
function drawPreviewCanvas(baseImage) {
    previewCanvas.style.display = 'block'; // Ensure canvas is visible
    const ctx = previewCanvas.getContext('2d'); // Get 2D rendering context
    
    // Calculate display dimensions for the preview, maintaining aspect ratio
    // based on the stored `actualPreviewRenderWidth`
    const canvasDisplayWidth = baseImage.actualPreviewRenderWidth;
    const canvasDisplayHeight = (canvasDisplayWidth / baseImage.width) * baseImage.height;

    // Set the canvas internal (buffer) resolution
    previewCanvas.width = canvasDisplayWidth;
    previewCanvas.height = canvasDisplayHeight;
    
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height); // Clear previous drawing
    ctx.drawImage(baseImage, 0, 0, previewCanvas.width, previewCanvas.height); // Draw the base image scaled to fit

    // Only draw the stamp element if text and position are selected
    if (userText && selectedPosition) {
        // Pass currentFontSize as the font size for barcode value text.
        // Also pass STAMP_CORNER_RADIUS for the rounded background.
        drawElement(ctx, userText, selectedPosition, previewCanvas.width, previewCanvas.height, currentFontSize, currentTextPadding, isBarcodeEnabled, currentBarcodeWidthPercentage, previewCanvas.width, STAMP_CORNER_RADIUS);
    }
}

// --- MODULAR DRAW FUNCTIONS START ---

/**
 * NEW: Generates a barcode or measures text to get content dimensions.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context (for text measurement).
 * @param {string} data - The text or barcode data.
 * @param {boolean} shouldDrawBarcode - True to generate a barcode, false to measure text.
 * @param {number} textFontSize - The font size for text or barcode value.
 * @param {number} barcodeTargetWidthPercent - Percentage of the baseImageActualWidth for the barcode.
 * @param {number} baseImageActualWidth - The actual width of the source image (for barcode percentage calculation).
 * @returns {object} An object with { actualContentWidth, actualContentHeight, contentElement (barcode canvas or null), error, errorMsg }
 */
function getContentDetails(ctx, data, shouldDrawBarcode, textFontSize, barcodeTargetWidthPercent, baseImageActualWidth) {
    let actualContentWidth, actualContentHeight;
    let contentElement = null; // Will hold the barcode canvas if applicable
    let error = false;
    let errorMsg = "";

    if (shouldDrawBarcode) {
        let targetPercentage = barcodeTargetWidthPercent;
        if (targetPercentage <= 0) targetPercentage = 5; // Default to 5% if 0 or less
        else if (targetPercentage < 5) targetPercentage = 5; // Min 5%

        const targetBarcodePixelWidth = baseImageActualWidth * (targetPercentage / 100);
        const tempBarcodeCanvas = document.createElement('canvas');
        try {
            JsBarcode(tempBarcodeCanvas, data, {
                format: "CODE128",
                lineColor: "#000000",
                width: 2, // Nominal bar width
                height: 50, // Nominal bar height
                displayValue: true,
                fontSize: textFontSize,
                margin: 5
            });
            if (tempBarcodeCanvas.width === 0) throw new Error("JsBarcode rendered zero-width canvas.");

            const sourceBarcodeWidth = tempBarcodeCanvas.width;
            const sourceBarcodeHeight = tempBarcodeCanvas.height;
            const scaleFactor = targetBarcodePixelWidth / sourceBarcodeWidth;
            
            actualContentWidth = targetBarcodePixelWidth;
            actualContentHeight = sourceBarcodeHeight * scaleFactor;
            contentElement = tempBarcodeCanvas; // Store the generated barcode canvas

            if (actualContentWidth < 10) actualContentWidth = 10;
            if (actualContentHeight < 10) actualContentHeight = 10;
        } catch (e) {
            console.error("Barcode generation error in getContentDetails:", e.message, "Data:", data);
            error = true;
            errorMsg = "Barcode Error";
            // Provide fallback dimensions for the error message itself
            ctx.font = `bold 16px Arial`; // Use a fixed font for error message measurement
            actualContentWidth = ctx.measureText(errorMsg).width;
            actualContentHeight = 16; // Approximate height for 16px text
        }
    } else { // Plain text
        ctx.font = `bold ${textFontSize}px Arial`;
        const textMetrics = ctx.measureText(data);
        actualContentWidth = textMetrics.width;
        actualContentHeight = textFontSize;
    }
    return { actualContentWidth, actualContentHeight, contentElement, error, errorMsg };
}

/**
 * NEW: Calculates the X and Y coordinates for the stamp element.
 * @param {string} position - The selected position (e.g., 'top-left').
 * @param {number} imageDisplayWidth - The width of the canvas.
 * @param {number} imageDisplayHeight - The height of the canvas.
 * @param {number} stampWidth - The total width of the stamp (content + padding).
 * @param {number} stampHeight - The total height of the stamp (content + padding).
 * @param {number} marginX - The horizontal margin from the canvas edge.
 * @param {number} marginY - The vertical margin from the canvas edge.
 * @returns {object} An object with { elementX, elementY }.
 */
function calculateStampCoordinates(position, imageDisplayWidth, imageDisplayHeight, stampWidth, stampHeight, marginX, marginY) {
    let elementX, elementY;

    if (position.includes('left')) elementX = marginX;
    else if (position.includes('right')) elementX = imageDisplayWidth - stampWidth - marginX;
    else elementX = (imageDisplayWidth - stampWidth) / 2; // Center X

    if (position.includes('top')) elementY = marginY;
    else if (position.includes('bottom')) elementY = imageDisplayHeight - stampHeight - marginY;
    else elementY = (imageDisplayHeight - stampHeight) / 2; // Center Y
    
    if (position === 'center') { // Explicit center overrides
        elementX = (imageDisplayWidth - stampWidth) / 2;
        elementY = (imageDisplayHeight - stampHeight) / 2;
    }
    return { elementX, elementY };
}

/**
 * Draws a rounded rectangle path using the current state of the canvas.
 * This function defines the path but does not fill or stroke it.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {number} x - The top-left x-coordinate of the rectangle.
 * @param {number} y - The top-left y-coordinate of the rectangle.
 * @param {number} width - The width of the rectangle.
 * @param {number} height - The height of the rectangle.
 * @param {number} radius - The corner radius. If too large, it's adjusted to fit.
 */
function roundRect(ctx, x, y, width, height, radius) {
  // Adjust radius if it's too large for the dimensions
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;
  
  ctx.beginPath(); // Start a new path
  ctx.moveTo(x + radius, y); // Move to the start of the top-left arc
  // Draw lines and arcs for the rounded corners
  ctx.arcTo(x + width, y,   x + width, y + height, radius); // Top-right corner
  ctx.arcTo(x + width, y + height, x, y + height, radius); // Bottom-right corner
  ctx.arcTo(x,   y + height, x, y,   radius); // Bottom-left corner
  ctx.arcTo(x,   y,   x + width, y,   radius); // Top-left corner
  ctx.closePath(); // Close the path, connecting the last point to the first
}

/**
 * NEW: Draws the background for the stamp.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {number} x - The top-left x-coordinate of the stamp background.
 * @param {number} y - The top-left y-coordinate of the stamp background.
 * @param {number} width - The width of the stamp background.
 * @param {number} height - The height of the stamp background.
 * @param {number} cornerRadius - The corner radius for the background.
 * @param {string} fillStyle - The fill style for the background.
 * @param {string} strokeStyle - The stroke style for the background border.
 * @param {number} lineWidth - The line width for the background border.
 */
function drawStampBackground(ctx, x, y, width, height, cornerRadius, fillStyle, strokeStyle, lineWidth) {
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;

    roundRect(ctx, x, y, width, height, cornerRadius); // Create the rounded path
    ctx.fill();   // Fill the path
    ctx.stroke(); // Stroke the path (draw the border)
}

/**
 * NEW: Draws the actual content (text or barcode) onto the stamp.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {string} data - The text data (used if not drawing a barcode from contentElement).
 * @param {boolean} shouldDrawBarcode - True if drawing a barcode.
 * @param {HTMLCanvasElement | null} barcodeElement - The pre-rendered barcode canvas, or null for text.
 * @param {number} drawX - The x-coordinate to start drawing the content.
 * @param {number} drawY - The y-coordinate to start drawing the content.
 * @param {number} contentWidth - The width of the content to draw.
 * @param {number} contentHeight - The height of the content to draw.
 * @param {number} textFontSize - Font size for text.
 * @param {number} stampElementX - The X coordinate of the overall stamp background (for text centering).
 * @param {number} stampElementWidth - The width of the overall stamp background (for text centering).
 * @param {number} stampElementY - The Y coordinate of the overall stamp background (for text centering).
 * @param {number} stampElementHeight - The height of the overall stamp background (for text centering).
 */
function drawStampContent(ctx, data, shouldDrawBarcode, barcodeElement, drawX, drawY, contentWidth, contentHeight, textFontSize, stampElementX, stampElementWidth, stampElementY, stampElementHeight) {
    if (shouldDrawBarcode && barcodeElement) {
        if (barcodeElement.width > 0 && barcodeElement.height > 0) {
            ctx.drawImage(barcodeElement, drawX, drawY, contentWidth, contentHeight);
        }
    } else if (!shouldDrawBarcode) { // Plain text
        ctx.fillStyle = '#000000'; // Black text color
        ctx.font = `bold ${textFontSize}px Arial`; // Ensure font is set for drawing
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Calculate center for text fill based on the padded element box
        const textDrawCenterX = stampElementX + stampElementWidth / 2;
        const textDrawCenterY = stampElementY + stampElementHeight / 2;
        ctx.fillText(data, textDrawCenterX, textDrawCenterY);
    }
}

// --- MODULAR DRAW FUNCTIONS END ---


/**
 * REFACTORED: Draws either a text stamp or a barcode onto the provided canvas context.
 * This function now orchestrates calls to modular helper functions.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {string} data - The text or barcode data.
 * @param {string} position - The selected position (e.g., 'top-left').
 * @param {number} imageDisplayWidth - The width of the canvas area where the image is currently displayed.
 * @param {number} imageDisplayHeight - The height of the canvas area where the image is currently displayed.
 * @param {number} mainTextFontSize - The font size (used for text mode, AND NOW for barcode value).
 * @param {number} padding - The padding around the element (text or barcode).
 * @param {boolean} drawBarcodeFlag - True to draw a barcode, false to draw text. (Renamed from drawBarcode to avoid conflict)
 * @param {number} barcodeWidthPercent - Percentage of the imageDisplayWidth for the barcode.
 * @param {number} baseImageActualWidth - The actual width of the source image (for barcode percentage calculation).
 * @param {number} cornerRadius - The radius for the stamp's rounded corners.
 */
function drawElement(ctx, data, position, imageDisplayWidth, imageDisplayHeight, mainTextFontSize, padding, drawBarcodeFlag, barcodeWidthPercent, baseImageActualWidth, cornerRadius) {
    // Define margins from the edge of the image/canvas
    const marginX = Math.max(10, imageDisplayWidth * 0.02);
    const marginY = Math.max(10, imageDisplayHeight * 0.02);

    // 1. Get Content Details (dimensions, barcode canvas if applicable, errors)
    const contentDetails = getContentDetails(ctx, data, drawBarcodeFlag, mainTextFontSize, barcodeWidthPercent, baseImageActualWidth);
    
    let { actualContentWidth, actualContentHeight, contentElement, error, errorMsg } = contentDetails;

    // 2. Handle Barcode Generation Error (if any)
    if (error && drawBarcodeFlag) { // Only draw error message if it was a barcode attempt that failed
        const errorStampWidth = actualContentWidth + 2 * padding; // actualContentWidth is now error message width
        const errorStampHeight = actualContentHeight + 2 * padding; // actualContentHeight is now error message height
        
        const { elementX: errorX, elementY: errorY } = calculateStampCoordinates(position, imageDisplayWidth, imageDisplayHeight, errorStampWidth, errorStampHeight, marginX, marginY);
        
        // Draw rectangular background for error message (not rounded for simplicity here)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(errorX, errorY, errorStampWidth, errorStampHeight);
        // Draw error text
        ctx.fillStyle = 'red';
        ctx.font = `bold 16px Arial`; // Ensure font is set for error message
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(errorMsg, errorX + errorStampWidth / 2, errorY + errorStampHeight / 2);
        return; // Stop further drawing for this element
    }

    // 3. Calculate Overall Stamp Dimensions (content + padding)
    const stampWidth = actualContentWidth + 2 * padding;
    const stampHeight = actualContentHeight + 2 * padding;

    // 4. Calculate Stamp Position
    const { elementX, elementY } = calculateStampCoordinates(position, imageDisplayWidth, imageDisplayHeight, stampWidth, stampHeight, marginX, marginY);

    // 5. Draw Stamp Background
    drawStampBackground(ctx, elementX, elementY, stampWidth, stampHeight, cornerRadius, 'rgba(255, 255, 255, 0.9)', 'rgba(200, 200, 200, 0.9)', 1);

    // 6. Draw Stamp Content (Text or Barcode)
    const contentDrawX = elementX + padding;
    const contentDrawY = elementY + padding;
    
    drawStampContent(ctx, data, drawBarcodeFlag, contentElement, contentDrawX, contentDrawY, actualContentWidth, actualContentHeight, mainTextFontSize, elementX, stampWidth, elementY, stampHeight);
}


/**
 * Checks if all required inputs (images, text, position) are provided.
 * @returns {boolean} True if all required inputs are present, false otherwise.
 */
function hasRequiredInputs() {
    return selectedImages.length > 0 && userText.trim() !== '' && selectedPosition;
}

/**
 * Checks if the application is ready to process images and enables/disables the process button.
 */
function checkIfReadyToProcess() {
    processButton.disabled = !hasRequiredInputs(); // Disable button if inputs are missing
}

/**
 * Processes all selected images: adds the text/barcode stamp and prepares them for download.
 * Updates progress bar and gallery.
 */
function processImages() {
    if (!hasRequiredInputs()) { // Double-check inputs before processing
        alert('Please select images, enter data, and choose a position before processing.');
        return;
    }
    processedImages = []; // Clear previous results
    gallery.innerHTML = ''; // Clear gallery display
    progressContainer.style.display = 'block'; // Show progress bar and text
    progressBar.value = 0; // Reset progress bar
    progressTextEl.textContent = `Processing 0/${selectedImages.length} images...`; // Initial progress text
    let processedCount = 0; // Counter for successfully processed images
    let errorCount = 0; // Counter for images that failed to process

    // Iterate over each selected file
    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(event) { // When file is read
            const img = new Image();
            img.onload = function() { // When image data is loaded
                const tempCanvas = document.createElement('canvas'); // Create a temporary canvas for each image
                tempCanvas.width = img.naturalWidth; // Set canvas to original image dimensions
                tempCanvas.height = img.naturalHeight;
                const ctx = tempCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height); // Draw original image on temp canvas
                
                // Draw the stamp (text or barcode) onto the temporary canvas
                // Note: The 10th argument to drawElement was barcodeValFontSize, which is now effectively mainTextFontSize.
                // The last argument is cornerRadius.
                drawElement(ctx, userText, selectedPosition, tempCanvas.width, tempCanvas.height, currentFontSize, currentTextPadding, isBarcodeEnabled, currentBarcodeWidthPercentage, img.naturalWidth, STAMP_CORNER_RADIUS); 
                
                // Get the processed image as a Data URL (JPEG format)
                const processedImageDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9); // 0.9 is quality
                processedImages.push({ name: file.name, dataUrl: processedImageDataUrl }); // Store for ZIP download
                addImageToGallery(processedImageDataUrl, file.name); // Add to visual gallery on the page
                
                processedCount++; // Increment successful count
                // Calculate total attempts to correctly update progress when errors occur
                let totalAttempts = processedCount + errorCount;
                progressBar.value = (totalAttempts / selectedImages.length) * 100; // Update progress bar based on total attempts
                progressTextEl.textContent = `Processing ${totalAttempts}/${selectedImages.length} images...`;


                // Check if all images have been attempted
                if (totalAttempts === selectedImages.length) {
                    if (errorCount > 0) {
                         progressTextEl.textContent = `Completed. Processed: ${processedCount}/${selectedImages.length}. Errors: ${errorCount}.`;
                    } else {
                        progressTextEl.textContent = `Completed processing ${selectedImages.length} images!`;
                    }
                    // If download all is checked and there are images processed, trigger download
                    if (downloadAllCheckbox.checked && processedImages.length > 0) {
                        downloadAllProcessedImages();
                    }
                }
            };
            img.onerror = function() { // Handle error loading an image
                console.error("Error processing image:", file.name);
                errorCount++; // Increment error count
                let totalAttempts = processedCount + errorCount;
                progressTextEl.textContent = `Error processing ${file.name}. (${totalAttempts}/${selectedImages.length})`;
                progressBar.value = (totalAttempts / selectedImages.length) * 100;

                // Check if all images have been attempted after an error
                 if (totalAttempts === selectedImages.length) {
                    if (errorCount === selectedImages.length) {
                        progressTextEl.textContent = `All ${errorCount} images failed to process.`;
                    } else {
                         progressTextEl.textContent = `Completed. Processed: ${processedCount}/${selectedImages.length}. Errors: ${errorCount}.`;
                    }
                    if (downloadAllCheckbox.checked && processedImages.length > 0) {
                        downloadAllProcessedImages();
                    }
                }
            }
            img.src = event.target.result; // Set image source from FileReader result
        };
        reader.onerror = function() { // Handle error reading a file
            console.error("Error reading file:", file.name);
            errorCount++;
            let totalAttempts = processedCount + errorCount;
            progressTextEl.textContent = `Error reading ${file.name}. (${totalAttempts}/${selectedImages.length})`;
            progressBar.value = (totalAttempts / selectedImages.length) * 100;

            // Check if all images have been attempted after a file read error
            if (totalAttempts === selectedImages.length) {
                 if (errorCount === selectedImages.length) {
                        progressTextEl.textContent = `All ${errorCount} images failed to load.`;
                    } else {
                        progressTextEl.textContent = `Completed. Processed: ${processedCount}/${selectedImages.length}. Errors: ${errorCount}.`;
                    }
                if (downloadAllCheckbox.checked && processedImages.length > 0) {
                    downloadAllProcessedImages();
                }
            }
        };
        reader.readAsDataURL(file); // Start reading the file
    });
}

/**
 * Adds a processed image thumbnail and a download button to the gallery display.
 * @param {string} dataUrl - The Data URL of the processed image.
 * @param {string} fileName - The original name of the image file.
 */
function addImageToGallery(dataUrl, fileName) {
    const container = document.createElement('div'); // Create container for image and button
    container.className = 'result-image-container';

    const imgEl = document.createElement('img'); // Create image element
    imgEl.src = dataUrl;
    imgEl.className = 'result-image';
    imgEl.alt = `Processed: ${fileName}`;
    imgEl.title = fileName; // Show original filename on hover

    const downloadBtn = document.createElement('a'); // Create download link
    downloadBtn.href = dataUrl;
    // Sanitize filename for download attribute (remove special chars, keep extension)
    const safeBaseName = fileName.substring(0, fileName.lastIndexOf('.')).replace(/[^\w\s-]/gi, '') || 'image';
    downloadBtn.download = `${safeBaseName}_stamped.jpg`; // Set download filename
    downloadBtn.textContent = 'Download';
    downloadBtn.className = 'download-btn';

    container.appendChild(imgEl); // Add image to container
    container.appendChild(downloadBtn); // Add download button to container
    gallery.appendChild(container); // Add container to the main gallery
}

/**
 * Compiles all processed images into a ZIP archive and initiates download.
 * Uses JSZip and FileSaver.js libraries.
 */
function downloadAllProcessedImages() {
    // Check if required libraries are loaded
    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
        console.error('JSZip or FileSaver libraries not loaded.');
        alert('Required libraries for ZIP download are missing.'); // Notify user
        progressTextEl.textContent = `Error: ZIP libraries not loaded. Download manually.`;
        return;
    }
    if (processedImages.length === 0) { // Check if there are any images to download
        progressTextEl.textContent = 'No images were successfully processed to download.';
        return;
    }
    progressTextEl.textContent = `Creating ZIP archive with ${processedImages.length} images...`;
    const zip = new JSZip(); // Initialize JSZip
    // Add each processed image to the ZIP
    processedImages.forEach((image) => {
        const imageData = image.dataUrl.replace(/^data:image\/(jpeg|png);base64,/, ""); // Strip base64 prefix
        // Sanitize filename for ZIP entry
        const safeBaseName = image.name.substring(0, image.name.lastIndexOf('.')).replace(/[^\w\s-]/gi, '') || 'image';
        zip.file(`${safeBaseName}_stamped.jpg`, imageData, { base64: true }); // Add file to zip
    });
    // Generate the ZIP file asynchronously
    zip.generateAsync({ type: "blob" })
        .then(function(content) { // When ZIP generation is complete
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Create a unique filename for the zip
            saveAs(content, `textstamped_images_${timestamp}.zip`); // Trigger download using FileSaver.js
            progressTextEl.textContent = `ZIP file with ${processedImages.length} images downloaded.`;
        })
        .catch(function(error) { // Handle errors during ZIP generation
            console.error('Error creating ZIP file:', error);
            progressTextEl.textContent = `Error creating ZIP file. See console. Try downloading manually.`;
        });
}

/**
 * Resets the entire application state to its initial defaults.
 * Clears selected images, text, position, UI elements, and progress.
 */
function resetApp() {
    // Reset global state variables
    selectedImages = [];
    processedImages = [];
    userText = '';
    selectedPosition = null;
    isBarcodeEnabled = false;
    currentBarcodeWidthPercentage = 20; // Reset to default
    currentFontSize = 24; // Reset to default
    currentTextPadding = 10; // Reset to default

    // Reset DOM elements values and states
    if (imageInput) imageInput.value = ''; // Clear file input selection
    if (textInput) textInput.value = '';
    if (fontSizeInput) {
        fontSizeInput.value = currentFontSize;
        fontSizeInput.disabled = false; // Re-enable
        fontSizeInput.title = "Controls font size for plain text."; // Reset title
    }
    if (fontSizeInputLabel) { // Reset label text for main font size input
        fontSizeInputLabel.textContent = "Font Size (px) (for text only):";
    }
    if (textPaddingInput) textPaddingInput.value = currentTextPadding;

    // Reset barcode specific controls
    if (barcodeWidthSlider) {
        barcodeWidthSlider.value = currentBarcodeWidthPercentage;
        barcodeWidthSlider.disabled = true; // Disable by default
    }
    if (barcodeWidthValueDisplay) barcodeWidthValueDisplay.textContent = currentBarcodeWidthPercentage;
    if (barcodeWidthSliderGroup) barcodeWidthSliderGroup.style.display = 'none'; // Hide

    // Reset and hide the dedicated barcode font size input if it exists
    if (barcodeValueFontSizeInput) {
        // barcodeValueFontSizeInput.value = 16; // Default if it were used
        barcodeValueFontSizeInput.disabled = true;
    }
    if (barcodeValueFontSizeGroup) barcodeValueFontSizeGroup.style.display = 'none';

    // Reset UI text indicators
    if (imageCountEl) imageCountEl.textContent = '';
    if (textInputStatusEl) textInputStatusEl.textContent = '';
    if (positionValueEl) positionValueEl.textContent = 'Selected Position: None';
    if (barcodeCheckbox) barcodeCheckbox.checked = false; // Uncheck barcode option
    if (barcodeStatusEl) barcodeStatusEl.textContent = '';

    // Reset position buttons selection
    if (positionButtons) positionButtons.forEach(btn => btn.classList.remove('selected'));

    // Reset progress display and gallery
    if (progressContainer) progressContainer.style.display = 'none';
    if (progressBar) progressBar.value = 0;
    if (progressTextEl) progressTextEl.textContent = 'Processing...'; // Default progress text
    if (gallery) gallery.innerHTML = ''; // Clear gallery

    // Reset preview canvas
    if (previewCanvas) {
        const ctx = previewCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height); // Clear canvas
        previewCanvas.style.display = 'none'; // Hide preview
        previewCanvas.loadedImageObject = null; // Clear cached image object
    }
    
    if (processButton) processButton.disabled = true; // Disable process button
    if (downloadAllCheckbox) downloadAllCheckbox.checked = true; // Reset download all option to checked

    console.log('TextStamp Web application has been reset.'); // Log reset action
}

/**
 * Sets up all necessary event listeners for the application's UI elements.
 * Called once the DOM is fully loaded.
 */
function setupEventListeners() {
    // Event listeners for file input, text input, position buttons
    if (imageInput) imageInput.addEventListener('change', handleImageSelection);
    if (textInput) textInput.addEventListener('input', handleTextChange);
    if (positionButtons) {
        positionButtons.forEach(button => button.addEventListener('click', handlePositionSelection));
    }
    // Event listeners for style options
    if (fontSizeInput) fontSizeInput.addEventListener('change', handleFontSizeChange);
    if (textPaddingInput) textPaddingInput.addEventListener('change', handleTextPaddingChange);
    if (barcodeWidthSlider) barcodeWidthSlider.addEventListener('input', handleBarcodeWidthSliderChange);
    
    // ADDED: Event listener for barcode value font size input (though it's currently hidden/disabled)
    // Kept for completeness or if the dedicated input is re-enabled in the future.
    if (barcodeValueFontSizeInput) barcodeValueFontSizeInput.addEventListener('change', handleBarcodeValueFontSizeChange);

    // Event listeners for barcode checkbox, process button, and reset button
    if (barcodeCheckbox) barcodeCheckbox.addEventListener('change', handleBarcodeCheckboxChange);
    if (processButton) processButton.addEventListener('click', processImages);
    if (resetButton) resetButton.addEventListener('click', resetApp);
    
    // Initial setup calls
    checkIfReadyToProcess(); // Set initial state of process button
    if (barcodeCheckbox) { // Call to set initial UI state for barcode related inputs based on checkbox's default state
        handleBarcodeCheckboxChange({ target: barcodeCheckbox }); // Pass a mock event object
    }
    updatePreview(); // Initial call to setup/hide preview canvas
}

// Initialize event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', setupEventListeners);
