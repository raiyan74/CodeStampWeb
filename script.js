// --- Global Variables ---
// These variables store the application's state and user's selections.

let selectedImages = []; // An array to hold the File objects of the images selected by the user.
let userText = ''; // A string to store the text input by the user.
let customPosition = null; // An object {x, y} to store the normalized coordinates (0 to 1) for the stamp's center.
let processedImages = []; // An array to store the processed images as data URLs, along with their original names.
let currentFontSize = 24; // The font size for the text or barcode value, in pixels.
let currentTextPadding = 10; // The padding around the text or barcode within the stamp, in pixels.
let isBarcodeEnabled = false; // A boolean flag to determine if the user wants to generate a barcode.
let currentBarcodeWidthPercentage = 20; // The desired width of the barcode as a percentage of the image's total width.
let currentOpacity = 0.9; // The opacity of the stamp (from 0.0 to 1.0).

// --- Constants ---
// A constant value for the corner radius of the stamp's background.
const STAMP_CORNER_RADIUS = 8;

// --- DOM Elements ---
// References to HTML elements are stored in constants for easy access.

const imageInput = document.getElementById('image-input');
const textInput = document.getElementById('text-input');
const imageCountEl = document.getElementById('image-count');
const textInputStatusEl = document.getElementById('text-input-status');
const positionValueEl = document.getElementById('position-value');
const fontSizeInput = document.getElementById('font-size-input');
const textPaddingInput = document.getElementById('text-padding-input');
const positionPlane = document.getElementById('position-plane');
let posPlaneCtx = null; // The 2D rendering context for the position selection canvas.
const opacitySlider = document.getElementById('opacity-slider');
const opacityValueDisplay = document.getElementById('opacity-value-display');
const barcodeWidthSlider = document.getElementById('barcode-width-slider');
const barcodeWidthValueDisplay = document.getElementById('barcode-width-value-display');
const barcodeWidthSliderGroup = document.getElementById('barcode-width-slider-group');
const previewCanvas = document.getElementById('preview-canvas');
const processButton = document.getElementById('process-button');
const downloadAllCheckbox = document.getElementById('download-all-checkbox');
const progressContainer = document.querySelector('.progress-container');
const progressBar = document.getElementById('progress-bar');
const progressTextEl = document.getElementById('progress-text');
const gallery = document.getElementById('gallery');
const resetButton = document.getElementById('reset-button');
const barcodeCheckbox = document.getElementById('barcode-checkbox');
const barcodeStatusEl = document.getElementById('barcode-status');

// --- Functions ---

/**
 * Handles the user's selection of image files.
 * Updates the 'selectedImages' array and the UI to show the count.
 * It also triggers loading the first selected image into the preview canvas.
 * @param {Event} e - The 'change' event from the file input.
 */
function handleImageSelection(e) {
    selectedImages = Array.from(e.target.files);
    imageCountEl.textContent = `Selected ${selectedImages.length} image(s)`;
    if (selectedImages.length > 0) {
        // If images are selected, load the first one for a preview.
        loadImageForPreview(selectedImages[0]);
    } else {
        // If no images are selected, hide the preview canvas.
        previewCanvas.style.display = 'none';
        if (previewCanvas.loadedImageObject) previewCanvas.loadedImageObject = null;
    }
    checkIfReadyToProcess(); // Check if the "Process" button can be enabled.
}

/**
 * Handles changes in the text input field.
 * Updates the 'userText' variable and the UI status message.
 * @param {Event} e - The 'input' event from the text field.
 */
function handleTextChange(e) {
    userText = e.target.value.trim();
    if (userText) {
        textInputStatusEl.textContent = `Data to use: "${userText}"`;
    } else {
        textInputStatusEl.textContent = 'No data entered.';
    }
    updatePreview();
    checkIfReadyToProcess();
}

/**
 * Draws the grid and crosshairs on the position selection canvas.
 * @param {number} [mouseX] - The current X coordinate of the mouse.
 * @param {number} [mouseY] - The current Y coordinate of the mouse.
 */
function drawPositionPlane(mouseX, mouseY) {
    if (!posPlaneCtx) return;
    const canvas = positionPlane;
    posPlaneCtx.clearRect(0, 0, canvas.width, canvas.height);
    posPlaneCtx.fillStyle = 'rgba(224, 224, 224, 0.3)';

    // Draw a grid of dots for visual guidance.
    const dotRadius = 1.5;
    const spacingX = canvas.width / 10;
    const spacingY = canvas.height / 14;
    for (let i = 1; i < 10; i++) {
        for (let j = 1; j < 14; j++) {
            posPlaneCtx.beginPath();
            posPlaneCtx.arc(i * spacingX, j * spacingY, dotRadius, 0, 2 * Math.PI);
            posPlaneCtx.fill();
        }
    }

    // If mouse coordinates are provided, draw crosshairs.
    if (typeof mouseX !== 'undefined' && typeof mouseY !== 'undefined') {
        posPlaneCtx.strokeStyle = 'rgba(224, 224, 224, 0.5)';
        posPlaneCtx.lineWidth = 1;
        // Horizontal line
        posPlaneCtx.beginPath();
        posPlaneCtx.moveTo(0, mouseY);
        posPlaneCtx.lineTo(canvas.width, mouseY);
        posPlaneCtx.stroke();
        // Vertical line
        posPlaneCtx.beginPath();
        posPlaneCtx.moveTo(mouseX, 0);
        posPlaneCtx.lineTo(mouseX, canvas.height);
        posPlaneCtx.stroke();
    }
}

/**
 * Handles clicks on the position selection plane.
 * Calculates and stores the relative (x, y) coordinates.
 * @param {Event} e - The 'click' event.
 */
function handlePositionPlaneClick(e) {
    const rect = positionPlane.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalize coordinates to a 0-1 range.
    const relativeX = x / positionPlane.clientWidth;
    const relativeY = y / positionPlane.clientHeight;
    customPosition = { x: relativeX, y: relativeY };

    // Update the UI to show the selected position in percentages.
    const percentX = (relativeX * 100).toFixed(1);
    const percentY = (relativeY * 100).toFixed(1);
    positionValueEl.textContent = `Selected Position: (${percentX}%, ${percentY}%)`;

    updatePreview();
    checkIfReadyToProcess();
}

/**
 * Handles changes to the font size input.
 * @param {Event} e - The 'change' event.
 */
function handleFontSizeChange(e) {
    currentFontSize = parseInt(e.target.value, 10);
    // Basic validation for font size.
    if (isNaN(currentFontSize) || currentFontSize < 10) currentFontSize = 10;
    if (currentFontSize > 100) currentFontSize = 100;
    e.target.value = currentFontSize;
    updatePreview();
}

/**
 * Handles changes to the text padding input.
 * @param {Event} e - The 'change' event.
 */
function handleTextPaddingChange(e) {
    currentTextPadding = parseInt(e.target.value, 10);
    // Basic validation for padding.
    if (isNaN(currentTextPadding) || currentTextPadding < 0) currentTextPadding = 0;
    if (currentTextPadding > 50) currentTextPadding = 50;
    e.target.value = currentTextPadding;
    updatePreview();
}

/**
 * Handles changes from the barcode width slider.
 * @param {Event} e - The 'input' event.
 */
function handleBarcodeWidthSliderChange(e) {
    currentBarcodeWidthPercentage = parseInt(e.target.value, 10);
    if (barcodeWidthValueDisplay) {
        barcodeWidthValueDisplay.textContent = currentBarcodeWidthPercentage;
    }
    if (isBarcodeEnabled) {
        updatePreview();
    }
}

/**
 * Handles changes from the opacity slider.
 * @param {Event} e - The 'input' event.
 */
function handleOpacityChange(e) {
    const opacityPercentage = parseInt(e.target.value, 10);
    currentOpacity = opacityPercentage / 100;
    if (opacityValueDisplay) {
        opacityValueDisplay.textContent = opacityPercentage;
    }
    updatePreview();
}

/**
 * Handles the barcode checkbox state change.
 * Toggles UI elements related to barcode settings.
 * @param {Event} e - The 'change' event.
 */
function handleBarcodeCheckboxChange(e) {
    isBarcodeEnabled = e.target.checked;
    const fontSizeInputLabel = document.querySelector('label[for="font-size-input"]');

    if (isBarcodeEnabled) {
        barcodeStatusEl.textContent = 'Barcode (CODE128) will be used.';
        if (fontSizeInputLabel) fontSizeInputLabel.textContent = "Font Size (px) (for barcode value):";
        if (barcodeWidthSliderGroup) barcodeWidthSliderGroup.style.display = 'block';
        if (barcodeWidthSlider) barcodeWidthSlider.disabled = false;
    } else {
        barcodeStatusEl.textContent = '';
        if (fontSizeInputLabel) fontSizeInputLabel.textContent = "Font Size (px):";
        if (barcodeWidthSliderGroup) barcodeWidthSliderGroup.style.display = 'none';
        if (barcodeWidthSlider) barcodeWidthSlider.disabled = true;
    }
    // The font size input remains enabled in both cases, but its label changes.
    if (fontSizeInput) {
        fontSizeInput.disabled = false;
        fontSizeInput.title = isBarcodeEnabled ?
            "Controls font size for the value displayed with the barcode." :
            "Controls font size for plain text.";
    }
    updatePreview();
}


/**
 * Loads a single image file for the preview canvas.
 * @param {File} file - The image file to load.
 */
function loadImageForPreview(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Calculate the dimensions for the preview display, constraining it to a max width/height.
            let newWidth = img.width;
            let newHeight = img.height;
            const parentElement = previewCanvas.parentElement;
            const maxWidth = parentElement && parentElement.clientWidth > 0 ? parentElement.clientWidth * 0.9 : 600;
            const maxHeight = 400;

            if (newWidth > maxWidth) {
                newHeight = (maxWidth / newWidth) * newHeight;
                newWidth = maxWidth;
            }
            if (newHeight > maxHeight) {
                newWidth = (maxHeight / newHeight) * newWidth;
                newHeight = maxHeight;
            }

            // Store the calculated preview width on the image object itself for later use.
            img.actualPreviewRenderWidth = newWidth;
            // Store the loaded image object on the canvas element for easy access.
            previewCanvas.loadedImageObject = img;
            updatePreview();
        };
        img.onerror = function() {
            console.error("Error loading image for preview.");
            previewCanvas.style.display = 'none';
            previewCanvas.loadedImageObject = null;
        }
        img.src = event.target.result; // Set the image source to the data URL.
    };
    reader.readAsDataURL(file);
}

/**
 * Main function to update the preview canvas.
 * It clears and redraws the canvas with the base image and the stamp element.
 */
function updatePreview() {
    const baseImage = previewCanvas.loadedImageObject;
    if (!baseImage) {
        // If there's no loaded image, try to load one if files are selected.
        if (selectedImages.length > 0 && !previewCanvas.loadedImageObject) {
            loadImageForPreview(selectedImages[0]);
        } else {
            // Otherwise, ensure the canvas is hidden and cleared.
            previewCanvas.style.display = 'none';
            const ctx = previewCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
            }
        }
        return;
    }
    if (!previewCanvas.getContext) {
        console.error("Canvas context not available for preview.");
        previewCanvas.style.display = 'none';
        return;
    }
    drawPreviewCanvas(baseImage);
}


/**
 * Draws the base image and the stamp overlay on the preview canvas.
 * @param {Image} baseImage - The loaded image object to draw.
 */
function drawPreviewCanvas(baseImage) {
    previewCanvas.style.display = 'block';
    const ctx = previewCanvas.getContext('2d');

    // Set the canvas dimensions based on the preview size calculated earlier.
    const canvasDisplayWidth = baseImage.actualPreviewRenderWidth;
    const canvasDisplayHeight = (canvasDisplayWidth / baseImage.width) * baseImage.height;
    previewCanvas.width = canvasDisplayWidth;
    previewCanvas.height = canvasDisplayHeight;

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(baseImage, 0, 0, previewCanvas.width, previewCanvas.height);

    // Only draw the stamp if there is text and a position has been selected.
    if (userText && customPosition) {
        // The `position` argument is no longer used by drawElement, so we pass null.
        drawElement(ctx, userText, null, previewCanvas.width, previewCanvas.height, currentFontSize, currentTextPadding, isBarcodeEnabled, currentBarcodeWidthPercentage, previewCanvas.width, STAMP_CORNER_RADIUS);
    }
}

/**
 * Calculates the dimensions of the content (text or barcode).
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {string} data - The text data.
 * @param {boolean} shouldDrawBarcode - Flag to indicate if it's a barcode.
 * @param {number} textFontSize - The font size for text.
 * @param {number} barcodeTargetWidthPercent - The target width percentage for the barcode.
 * @param {number} baseImageActualWidth - The actual width of the image being processed.
 * @returns {object} An object containing the content's width, height, and the barcode canvas element if applicable.
 */
function getContentDetails(ctx, data, shouldDrawBarcode, textFontSize, barcodeTargetWidthPercent, baseImageActualWidth) {
    let actualContentWidth, actualContentHeight;
    let contentElement = null; // Will hold the canvas for the barcode.
    let error = false;
    let errorMsg = "";

    if (shouldDrawBarcode) {
        // Ensure the percentage is within a reasonable range.
        let targetPercentage = barcodeTargetWidthPercent;
        if (targetPercentage <= 0) targetPercentage = 5;
        else if (targetPercentage < 5) targetPercentage = 5;

        // Calculate the target pixel width based on the percentage of the full-size image.
        const targetBarcodePixelWidth = baseImageActualWidth * (targetPercentage / 100);

        // Create a temporary canvas to generate the barcode.
        const tempBarcodeCanvas = document.createElement('canvas');
        try {
            JsBarcode(tempBarcodeCanvas, data, {
                format: "CODE128",
                lineColor: "#000000",
                width: 2, // Base width of barcode lines
                height: 50, // Base height
                displayValue: true, // Show text value below barcode
                fontSize: textFontSize,
                margin: 5
            });
            if (tempBarcodeCanvas.width === 0) throw new Error("JsBarcode rendered zero-width canvas.");

            // Scale the generated barcode to the target width.
            const sourceBarcodeWidth = tempBarcodeCanvas.width;
            const sourceBarcodeHeight = tempBarcodeCanvas.height;
            const scaleFactor = targetBarcodePixelWidth / sourceBarcodeWidth;
            actualContentWidth = targetBarcodePixelWidth;
            actualContentHeight = sourceBarcodeHeight * scaleFactor;
            contentElement = tempBarcodeCanvas;

            // Ensure dimensions are not too small.
            if (actualContentWidth < 10) actualContentWidth = 10;
            if (actualContentHeight < 10) actualContentHeight = 10;

        } catch (e) {
            // Handle errors during barcode generation.
            console.error("Barcode generation error in getContentDetails:", e.message, "Data:", data);
            error = true;
            errorMsg = "Barcode Error";
            ctx.font = `bold 16px Arial`;
            actualContentWidth = ctx.measureText(errorMsg).width;
            actualContentHeight = 16;
        }
    } else {
        // For plain text, measure its width and height.
        ctx.font = `bold ${textFontSize}px Arial`;
        const textMetrics = ctx.measureText(data);
        actualContentWidth = textMetrics.width;
        actualContentHeight = textFontSize;
    }
    return { actualContentWidth, actualContentHeight, contentElement, error, errorMsg };
}


/**
 * A utility function to draw a rectangle with rounded corners.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {number} x - The top-left x-coordinate.
 * @param {number} y - The top-left y-coordinate.
 * @param {number} width - The width of the rectangle.
 * @param {number} height - The height of the rectangle.
 * @param {number} radius - The corner radius.
 */
function roundRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}

/**
 * Draws the white, rounded-corner background for the stamp.
 * @param {CanvasRenderingContext2D} ctx - The canvas context.
 * @param {number} x - The top-left x-coordinate of the background.
 * @param {number} y - The top-left y-coordinate of the background.
 * @param {number} width - The width of the background.
 * @param {number} height - The height of the background.
 * @param {number} cornerRadius - The corner radius.
 * @param {string} fillStyle - The fill color.
 * @param {string} strokeStyle - The stroke color.
 * @param {number} lineWidth - The width of the stroke.
 */
function drawStampBackground(ctx, x, y, width, height, cornerRadius, fillStyle, strokeStyle, lineWidth) {
    ctx.fillStyle = fillStyle;
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    roundRect(ctx, x, y, width, height, cornerRadius);
    ctx.fill();
    ctx.stroke();
}


/**
 * Draws the actual content (text or barcode) onto the stamp background.
 * @param {CanvasRenderingContext2D} ctx - The main canvas context.
 * @param {string} data - The text data.
 * @param {boolean} shouldDrawBarcode - Flag indicating if content is a barcode.
 * @param {HTMLCanvasElement} barcodeElement - The canvas element with the generated barcode.
 * @param {number} drawX - The x-coordinate for drawing the content.
 * @param {number} drawY - The y-coordinate for drawing the content.
 * @param {number} contentWidth - The width of the content.
 * @param {number} contentHeight - The height of the content.
 * @param {number} textFontSize - Font size for plain text.
 * @param {number} stampElementX - The top-left x-coordinate of the entire stamp.
 * @param {number} stampElementWidth - The total width of the stamp.
 * @param {number} stampElementY - The top-left y-coordinate of the entire stamp.
 * @param {number} stampElementHeight - The total height of the stamp.
 */
function drawStampContent(ctx, data, shouldDrawBarcode, barcodeElement, drawX, drawY, contentWidth, contentHeight, textFontSize, stampElementX, stampElementWidth, stampElementY, stampElementHeight) {
    if (shouldDrawBarcode && barcodeElement) {
        // Draw the barcode image onto the canvas if it was successfully generated.
        if (barcodeElement.width > 0 && barcodeElement.height > 0) {
            ctx.drawImage(barcodeElement, drawX, drawY, contentWidth, contentHeight);
        }
    } else if (!shouldDrawBarcode) {
        // For plain text, set properties and draw it centered within the stamp.
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${textFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textDrawCenterX = stampElementX + stampElementWidth / 2;
        const textDrawCenterY = stampElementY + stampElementHeight / 2;
        ctx.fillText(data, textDrawCenterX, textDrawCenterY);
    }
}

/**
 * Main drawing function that orchestrates the creation of the stamp element on a canvas.
 * @param {CanvasRenderingContext2D} ctx - The context of the canvas to draw on.
 * @param {string} data - The text or barcode data.
 * @param {object} position - This argument is deprecated and no longer used.
 * @param {number} imageDisplayWidth - The width of the image area on the canvas.
 * @param {number} imageDisplayHeight - The height of the image area on the canvas.
 * @param {number} mainTextFontSize - The font size for the text.
 * @param {number} padding - The padding for the stamp.
 * @param {boolean} drawBarcodeFlag - Whether to draw a barcode.
 * @param {number} barcodeWidthPercent - The width percentage for the barcode.
 * @param {number} baseImageActualWidth - The original width of the image.
 * @param {number} cornerRadius - The corner radius for the stamp background.
 */
function drawElement(ctx, data, position, imageDisplayWidth, imageDisplayHeight, mainTextFontSize, padding, drawBarcodeFlag, barcodeWidthPercent, baseImageActualWidth, cornerRadius) {
    ctx.save(); // Save the current canvas state.
    ctx.globalAlpha = currentOpacity; // Apply the selected opacity.

    // Get the details (dimensions, etc.) of the content to be drawn.
    const contentDetails = getContentDetails(ctx, data, drawBarcodeFlag, mainTextFontSize, barcodeWidthPercent, baseImageActualWidth);
    let { actualContentWidth, actualContentHeight, contentElement, error, errorMsg } = contentDetails;

    // Calculate the total dimensions of the stamp including padding.
    const stampWidth = actualContentWidth + 2 * padding;
    const stampHeight = actualContentHeight + 2 * padding;
    let elementX, elementY;

    if (customPosition) {
        // Calculate the top-left corner of the stamp based on the centered custom position.
        const centerX = customPosition.x * imageDisplayWidth;
        const centerY = customPosition.y * imageDisplayHeight;
        elementX = centerX - (stampWidth / 2);
        elementY = centerY - (stampHeight / 2);
        // Ensure the stamp does not go outside the image boundaries.
        elementX = Math.max(0, Math.min(elementX, imageDisplayWidth - stampWidth));
        elementY = Math.max(0, Math.min(elementY, imageDisplayHeight - stampHeight));
    } else {
        // If no position is set, do nothing.
        ctx.restore();
        return;
    }

    // If there was an error generating a barcode, display an error message.
    if (error && drawBarcodeFlag) {
        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect(elementX, elementY, stampWidth, stampHeight);
        ctx.fillStyle = 'red';
        ctx.font = `bold 16px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(errorMsg, elementX + stampWidth / 2, elementY + stampHeight / 2);
        ctx.restore();
        return;
    }

    // Draw the rounded background for the stamp.
    drawStampBackground(ctx, elementX, elementY, stampWidth, stampHeight, cornerRadius, 'rgb(255, 255, 255)', 'rgb(200, 200, 200)', 1);

    // Calculate the position to draw the content inside the stamp background.
    const contentDrawX = elementX + padding;
    const contentDrawY = elementY + padding;

    // Draw the actual content (text or barcode).
    drawStampContent(ctx, data, drawBarcodeFlag, contentElement, contentDrawX, contentDrawY, actualContentWidth, actualContentHeight, mainTextFontSize, elementX, stampWidth, elementY, stampHeight);

    ctx.restore(); // Restore the canvas state.
}


/**
 * Checks if all required inputs (images, text, position) are provided.
 * @returns {boolean} - True if all inputs are present, false otherwise.
 */
function hasRequiredInputs() {
    return selectedImages.length > 0 && userText.trim() !== '' && customPosition !== null;
}

/**
 * Enables or disables the "Process Images" button based on input validity.
 */
function checkIfReadyToProcess() {
    processButton.disabled = !hasRequiredInputs();
}

/**
 * Loops through all selected images and applies the stamping effect.
 */
function processImages() {
    if (!hasRequiredInputs()) {
        alert('Please select images, enter data, and choose a position before processing.');
        return;
    }

    // Reset state before processing.
    processedImages = [];
    gallery.innerHTML = '';
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressTextEl.textContent = `Processing 0/${selectedImages.length} images...`;

    let processedCount = 0;
    let errorCount = 0;

    selectedImages.forEach((file) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Create a temporary canvas for each image at its original resolution.
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;
                const ctx = tempCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

                // Draw the stamp element onto this full-resolution canvas.
                drawElement(ctx, userText, null, tempCanvas.width, tempCanvas.height, currentFontSize, currentTextPadding, isBarcodeEnabled, currentBarcodeWidthPercentage, img.naturalWidth, STAMP_CORNER_RADIUS);

                // Get the result as a data URL.
                const processedImageDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
                processedImages.push({ name: file.name, dataUrl: processedImageDataUrl });
                addImageToGallery(processedImageDataUrl, file.name);

                processedCount++;
                updateProcessingProgress(processedCount, errorCount);
            };
            img.onerror = function() {
                console.error("Error processing image:", file.name);
                errorCount++;
                updateProcessingProgress(processedCount, errorCount, file.name);
            }
            img.src = event.target.result;
        };
        reader.onerror = function() {
            console.error("Error reading file:", file.name);
            errorCount++;
            updateProcessingProgress(processedCount, errorCount, file.name);
        };
        reader.readAsDataURL(file);
    });
}

/**
 * REFACTORED HELPER FUNCTION
 * Updates the progress bar and text during image processing.
 * This function centralizes the logic for updating progress from both success and error handlers.
 * @param {number} processedCount - The number of successfully processed images.
 * @param {number} errorCount - The number of images that failed to process.
 * @param {string} [errorFileName] - The name of the file that caused an error, if any.
 */
function updateProcessingProgress(processedCount, errorCount, errorFileName = '') {
    const totalAttempts = processedCount + errorCount;
    const totalImages = selectedImages.length;

    // Update progress bar
    progressBar.value = (totalAttempts / totalImages) * 100;

    // Update progress text
    if (errorFileName) {
        progressTextEl.textContent = `Error processing ${errorFileName}. (${totalAttempts}/${totalImages})`;
    } else {
        progressTextEl.textContent = `Processing ${totalAttempts}/${totalImages} images...`;
    }

    // Check if processing is complete
    if (totalAttempts === totalImages) {
        if (errorCount > 0) {
            progressTextEl.textContent = `Completed. Processed: ${processedCount}/${totalImages}. Errors: ${errorCount}.`;
        } else {
            progressTextEl.textContent = `Completed processing ${totalImages} images!`;
        }
        // If the "Download All" checkbox is checked, trigger the download.
        if (downloadAllCheckbox.checked && processedImages.length > 0) {
            downloadAllProcessedImages();
        }
    }
}


/**
 * Adds a processed image to the gallery section of the page.
 * @param {string} dataUrl - The data URL of the processed image.
 * @param {string} fileName - The original name of the file.
 */
function addImageToGallery(dataUrl, fileName) {
    const container = document.createElement('div');
    container.className = 'result-image-container';

    const imgEl = document.createElement('img');
    imgEl.src = dataUrl;
    imgEl.className = 'result-image';
    imgEl.alt = `Processed: ${fileName}`;
    imgEl.title = fileName;

    const downloadBtn = document.createElement('a');
    downloadBtn.href = dataUrl;
    // Sanitize the filename for the download attribute.
    const safeBaseName = fileName.substring(0, fileName.lastIndexOf('.')).replace(/[^\w\s-]/gi, '') || 'image';
    downloadBtn.download = `${safeBaseName}_stamped.jpg`;
    downloadBtn.textContent = 'Download';
    downloadBtn.className = 'download-btn';

    container.appendChild(imgEl);
    container.appendChild(downloadBtn);
    gallery.appendChild(container);
}

/**
 * Zips all processed images and initiates a download using JSZip and FileSaver.js.
 */
function downloadAllProcessedImages() {
    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
        console.error('JSZip or FileSaver libraries not loaded.');
        alert('Required libraries for ZIP download are missing.');
        progressTextEl.textContent = `Error: ZIP libraries not loaded. Download manually.`;
        return;
    }
    if (processedImages.length === 0) {
        progressTextEl.textContent = 'No images were successfully processed to download.';
        return;
    }

    progressTextEl.textContent = `Creating ZIP archive with ${processedImages.length} images...`;
    const zip = new JSZip();

    processedImages.forEach((image) => {
        // Extract the base64 data from the data URL.
        const imageData = image.dataUrl.replace(/^data:image\/(jpeg|png);base64,/, "");
        const safeBaseName = image.name.substring(0, image.name.lastIndexOf('.')).replace(/[^\w\s-]/gi, '') || 'image';
        zip.file(`${safeBaseName}_stamped.jpg`, imageData, { base64: true });
    });

    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            // Create a timestamp for a unique zip file name.
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            saveAs(content, `textstamped_images_${timestamp}.zip`);
            progressTextEl.textContent = `ZIP file with ${processedImages.length} images downloaded.`;
        })
        .catch(function(error) {
            console.error('Error creating ZIP file:', error);
            progressTextEl.textContent = `Error creating ZIP file. See console. Try downloading manually.`;
        });
}


/**
 * Resets the entire application state and UI to its initial default values.
 */
function resetApp() {
    // Reset all global state variables
    selectedImages = [];
    processedImages = [];
    userText = '';
    customPosition = null;
    isBarcodeEnabled = false;
    currentBarcodeWidthPercentage = 20;
    currentOpacity = 0.9;
    currentFontSize = 24;
    currentTextPadding = 10;

    // Reset UI elements
    if (imageInput) imageInput.value = '';
    if (textInput) textInput.value = '';
    if (fontSizeInput) {
        fontSizeInput.value = currentFontSize;
        fontSizeInput.disabled = false;
        fontSizeInput.title = "Controls font size for plain text.";
    }
    if (textPaddingInput) textPaddingInput.value = currentTextPadding;
    if (opacitySlider) opacitySlider.value = currentOpacity * 100;
    if (opacityValueDisplay) opacityValueDisplay.textContent = currentOpacity * 100;
    if (barcodeWidthSlider) {
        barcodeWidthSlider.value = currentBarcodeWidthPercentage;
        barcodeWidthSlider.disabled = true;
    }
    if (barcodeWidthValueDisplay) barcodeWidthValueDisplay.textContent = currentBarcodeWidthPercentage;
    if (barcodeWidthSliderGroup) barcodeWidthSliderGroup.style.display = 'none';
    if (imageCountEl) imageCountEl.textContent = '';
    if (textInputStatusEl) textInputStatusEl.textContent = '';
    if (positionValueEl) positionValueEl.textContent = 'Selected Position: None';
    if (barcodeCheckbox) barcodeCheckbox.checked = false;
    if (barcodeStatusEl) barcodeStatusEl.textContent = '';

    drawPositionPlane(); // Redraw the position plane (clears it)

    if (progressContainer) progressContainer.style.display = 'none';
    if (progressBar) progressBar.value = 0;
    if (progressTextEl) progressTextEl.textContent = 'Processing...';
    if (gallery) gallery.innerHTML = '';
    if (previewCanvas) {
        const ctx = previewCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCanvas.style.display = 'none';
        previewCanvas.loadedImageObject = null;
    }
    if (processButton) processButton.disabled = true;
    if (downloadAllCheckbox) downloadAllCheckbox.checked = true;

    console.log('CodeStamp Web application has been reset.');
}

/**
 * Sets up all the initial event listeners for the UI elements.
 */
function setupEventListeners() {
    if (imageInput) imageInput.addEventListener('change', handleImageSelection);
    if (textInput) textInput.addEventListener('input', handleTextChange);
    if (positionPlane) {
        posPlaneCtx = positionPlane.getContext('2d');
        const rect = positionPlane.getBoundingClientRect();
        positionPlane.width = rect.width;
        positionPlane.height = rect.height;
        positionPlane.addEventListener('click', handlePositionPlaneClick);
        positionPlane.addEventListener('mousemove', (e) => {
            const rect = positionPlane.getBoundingClientRect();
            drawPositionPlane(e.clientX - rect.left, e.clientY - rect.top);
        });
        positionPlane.addEventListener('mouseleave', () => {
            drawPositionPlane();
        });
        drawPositionPlane(); // Initial draw
    }
    if (fontSizeInput) fontSizeInput.addEventListener('change', handleFontSizeChange);
    if (textPaddingInput) textPaddingInput.addEventListener('change', handleTextPaddingChange);
    if (barcodeWidthSlider) barcodeWidthSlider.addEventListener('input', handleBarcodeWidthSliderChange);
    if (opacitySlider) opacitySlider.addEventListener('input', handleOpacityChange);
    if (barcodeCheckbox) barcodeCheckbox.addEventListener('change', handleBarcodeCheckboxChange);
    if (processButton) processButton.addEventListener('click', processImages);
    if (resetButton) resetButton.addEventListener('click', resetApp);

    // Initial setup calls
    checkIfReadyToProcess();
    if (barcodeCheckbox) {
        handleBarcodeCheckboxChange({ target: barcodeCheckbox }); // Set initial barcode UI state
    }
    updatePreview();
}

// The entry point of the script: sets up event listeners when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', setupEventListeners);