// Global variables
let selectedImages = [];
let userText = ''; // To store the text input by the user OR data for barcode
let selectedPosition = null;
let processedImages = [];
let currentFontSize = 24; // Default font size for text OR barcode value
let currentTextPadding = 10; // Default padding around the element (text or barcode)
let isBarcodeEnabled = false; // To track if barcode mode is active
let currentBarcodeWidthPercentage = 20; // Default barcode width percentage
// let currentBarcodeValueFontSize = 16; // This variable is no longer the primary controller for barcode font if main input is used.

// DOM Elements
const imageInput = document.getElementById('image-input');
const textInput = document.getElementById('text-input');
const imageCountEl = document.getElementById('image-count');
const textInputStatusEl = document.getElementById('text-input-status');
const positionButtons = document.querySelectorAll('.position-button');
const positionValueEl = document.getElementById('position-value');
const fontSizeInput = document.getElementById('font-size-input');
const textPaddingInput = document.getElementById('text-padding-input');

// Get the label for the main font size input
const fontSizeInputLabel = document.getElementById('font-size-input-label'); // Make sure this ID exists on the label in HTML

// DOM element for the dedicated barcode value font size (will be hidden)
const barcodeValueFontSizeInput = document.getElementById('barcode-value-font-size-input'); // This might not exist if you remove it from HTML
const barcodeValueFontSizeGroup = document.getElementById('barcode-value-font-size-group'); // This might not exist if you remove it from HTML

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

function handleImageSelection(e) {
    selectedImages = Array.from(e.target.files);
    imageCountEl.textContent = `Selected ${selectedImages.length} image(s)`;
    if (selectedImages.length > 0) {
        loadImageForPreview(selectedImages[0]);
    } else {
        previewCanvas.style.display = 'none';
        if (previewCanvas.loadedImageObject) previewCanvas.loadedImageObject = null; // Clear cached image
    }
    checkIfReadyToProcess();
}

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

function handlePositionSelection() {
    positionButtons.forEach(btn => btn.classList.remove('selected'));
    this.classList.add('selected');
    selectedPosition = this.getAttribute('data-position');
    const friendlyPosition = selectedPosition.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    positionValueEl.textContent = `Selected Position: ${friendlyPosition}`;
    updatePreview();
    checkIfReadyToProcess();
}

function handleFontSizeChange(e) {
    currentFontSize = parseInt(e.target.value, 10);
    if (isNaN(currentFontSize) || currentFontSize < 10) currentFontSize = 10;
    if (currentFontSize > 100) currentFontSize = 100;
    e.target.value = currentFontSize; // Ensure input reflects validated value
    updatePreview();
}

function handleTextPaddingChange(e) {
    currentTextPadding = parseInt(e.target.value, 10);
    if (isNaN(currentTextPadding) || currentTextPadding < 0) currentTextPadding = 0;
    if (currentTextPadding > 50) currentTextPadding = 50;
    e.target.value = currentTextPadding; // Ensure input reflects validated value
    updatePreview();
}

function handleBarcodeWidthSliderChange(e) {
    currentBarcodeWidthPercentage = parseInt(e.target.value, 10);
    if (barcodeWidthValueDisplay) {
        barcodeWidthValueDisplay.textContent = currentBarcodeWidthPercentage;
    }
    if (isBarcodeEnabled) { // Only update preview if barcode mode is active
        updatePreview();
    }
}

// This function for a dedicated barcode font size input is now effectively superseded
// as the main font size input will control the barcode's text value font.
// It can be removed or commented out if the corresponding HTML elements are removed.
function handleBarcodeValueFontSizeChange(e) {
    // This logic is no longer primary if the main font size input is used for barcodes.
    // If you decide to keep a separate input, this would be its handler.
    // For now, it does nothing as the main font size input is the controller.
}

function handleBarcodeCheckboxChange(e) {
    isBarcodeEnabled = e.target.checked;

    if (isBarcodeEnabled) {
        barcodeStatusEl.textContent = 'Barcode (CODE128) will be used.';
        if (fontSizeInput) {
            fontSizeInput.disabled = false; // Ensure it's enabled
            fontSizeInput.title = "Controls font size for the value displayed with the barcode, or for plain text.";
        }
        if (fontSizeInputLabel) { // Update the label text
            fontSizeInputLabel.textContent = "Font Size (px) (for barcode value / text):";
        }

        if (barcodeWidthSliderGroup) barcodeWidthSliderGroup.style.display = 'block';
        if (barcodeWidthSlider) barcodeWidthSlider.disabled = false;

        // Hide and disable the dedicated barcode value font size input if it exists, as it's superseded
        if (barcodeValueFontSizeGroup) barcodeValueFontSizeGroup.style.display = 'none';
        if (barcodeValueFontSizeInput) barcodeValueFontSizeInput.disabled = true;

    } else {
        barcodeStatusEl.textContent = ''; // Clear barcode status
        if (fontSizeInput) {
            fontSizeInput.disabled = false; // Still enabled for text
            fontSizeInput.title = "Controls font size for plain text.";
        }
        if (fontSizeInputLabel) { // Revert the label text
            fontSizeInputLabel.textContent = "Font Size (px) (for text only):";
        }

        if (barcodeWidthSliderGroup) barcodeWidthSliderGroup.style.display = 'none';
        if (barcodeWidthSlider) barcodeWidthSlider.disabled = true;

        // Ensure dedicated barcode font size input remains hidden/disabled
        if (barcodeValueFontSizeGroup) barcodeValueFontSizeGroup.style.display = 'none';
        if (barcodeValueFontSizeInput) barcodeValueFontSizeInput.disabled = true;
    }
    updatePreview(); // Update preview to reflect the change
}


function loadImageForPreview(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            let newWidth = img.width;
            let newHeight = img.height;
            const parentElement = previewCanvas.parentElement;
            // Ensure parentElement is valid and has clientWidth before using it
            const maxWidth = parentElement && parentElement.clientWidth > 0 ? parentElement.clientWidth * 0.9 : 600; // Fallback width
            const maxHeight = 400; // Max height for preview

            // Aspect ratio scaling
            if (newWidth > maxWidth) {
                newHeight = (maxWidth / newWidth) * newHeight;
                newWidth = maxWidth;
            }
            if (newHeight > maxHeight) { // Check if new height after width scaling exceeds max height
                newWidth = (maxHeight / newHeight) * newWidth; // Recalculate width based on maxHeight
                newHeight = maxHeight;
            }
            img.actualPreviewRenderWidth = newWidth; // Store the calculated width for rendering
            previewCanvas.loadedImageObject = img; // Cache the loaded image object
            updatePreview(); // Call updatePreview to draw with the new image
        };
        img.onerror = function() {
            console.error("Error loading image for preview.");
            previewCanvas.style.display = 'none';
            previewCanvas.loadedImageObject = null; // Clear cached image on error
        }
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updatePreview() {
    const baseImage = previewCanvas.loadedImageObject;

    if (!baseImage) {
        // If no image is loaded (e.g., after deselecting all images or on initial load)
        if (selectedImages.length > 0 && !previewCanvas.loadedImageObject) {
            loadImageForPreview(selectedImages[0]); // Attempt to load the first selected image if not already loaded
        } else {
            previewCanvas.style.display = 'none'; // Hide canvas if no image
            const ctx = previewCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height); // Clear canvas
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

function drawPreviewCanvas(baseImage) {
    previewCanvas.style.display = 'block'; // Ensure canvas is visible
    const ctx = previewCanvas.getContext('2d');
    
    // Calculate display dimensions maintaining aspect ratio based on stored preview render width
    const canvasDisplayWidth = baseImage.actualPreviewRenderWidth;
    const canvasDisplayHeight = (canvasDisplayWidth / baseImage.width) * baseImage.height;

    previewCanvas.width = canvasDisplayWidth; // Set canvas internal resolution
    previewCanvas.height = canvasDisplayHeight;
    
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height); // Clear previous drawing
    ctx.drawImage(baseImage, 0, 0, previewCanvas.width, previewCanvas.height); // Draw the base image

    // Only draw element if text and position are selected
    if (userText && selectedPosition) {
        // Pass currentFontSize as the font size for barcode value text
        // The last argument to drawElement is barcodeValFontSize, which now gets currentFontSize
        drawElement(ctx, userText, selectedPosition, previewCanvas.width, previewCanvas.height, currentFontSize, currentTextPadding, isBarcodeEnabled, currentBarcodeWidthPercentage, previewCanvas.width, currentFontSize);
    }
}


/**
 * Draws either a text stamp or a barcode onto the provided canvas context.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {string} data - The text or barcode data.
 * @param {string} position - The selected position (e.g., 'top-left').
 * @param {number} imageDisplayWidth - The width of the canvas area where the image is currently displayed.
 * @param {number} imageDisplayHeight - The height of the canvas area where the image is currently displayed.
 * @param {number} mainTextFontSize - The font size (used for text mode, AND NOW for barcode value).
 * @param {number} padding - The padding around the element.
 * @param {boolean} drawBarcode - True to draw a barcode, false to draw text.
 * @param {number} barcodeWidthPercent - Percentage of the imageDisplayWidth for the barcode.
 * @param {number} baseImageActualWidth - The actual width of the source image (preview or final) for percentage calculation.
 * @param {number} barcodeValFontSize - Font size for the text under the barcode (NOW this will be mainTextFontSize).
 */
function drawElement(ctx, data, position, imageDisplayWidth, imageDisplayHeight, mainTextFontSize, padding, drawBarcode, barcodeWidthPercent, baseImageActualWidth, barcodeValFontSize) {
    const marginX = Math.max(10, imageDisplayWidth * 0.02); // Minimum 10px or 2% of width
    const marginY = Math.max(10, imageDisplayHeight * 0.02); // Minimum 10px or 2% of height
    let elementX, elementY, elementWidth, elementHeight;
    let actualContentWidth, actualContentHeight;

    if (drawBarcode) {
        let targetPercentage = barcodeWidthPercent;
        // Ensure a minimum width for the barcode if enabled and percentage is too low
        if (targetPercentage <= 0 && isBarcodeEnabled) targetPercentage = 5; // Default to 5% if 0 or less
        else if (targetPercentage < 5 && isBarcodeEnabled) targetPercentage = 5; // Min 5%

        const targetBarcodePixelWidth = baseImageActualWidth * (targetPercentage / 100);
        const tempBarcodeCanvas = document.createElement('canvas'); // Temporary canvas for barcode generation
        try {
            JsBarcode(tempBarcodeCanvas, data, {
                format: "CODE128",
                lineColor: "#000000", // Black lines for barcode
                width: 2, // Bar width (JsBarcode will scale this based on final dimensions)
                height: 50, // Height of the barcode bars (JsBarcode will scale this)
                displayValue: true, // Show the text value below the barcode
                fontSize: mainTextFontSize, // MODIFIED: Use mainTextFontSize (from font-size-input) for barcode value
                margin: 5 // Margin around the barcode within its generated canvas
            });
            if (tempBarcodeCanvas.width === 0) throw new Error("JsBarcode rendered zero-width canvas."); // Error check

            const sourceBarcodeWidth = tempBarcodeCanvas.width;
            const sourceBarcodeHeight = tempBarcodeCanvas.height;
            const scaleFactor = targetBarcodePixelWidth / sourceBarcodeWidth; // Scale to fit target width

            actualContentWidth = targetBarcodePixelWidth;
            actualContentHeight = sourceBarcodeHeight * scaleFactor;

            // Ensure minimum dimensions for visibility
            if (actualContentWidth < 10) actualContentWidth = 10;
            if (actualContentHeight < 10) actualContentHeight = 10;

        } catch (e) {
            console.error("Barcode generation error:", e.message, "Data:", data);
            // Fallback: Display an error message on the canvas
            ctx.fillStyle = 'red';
            ctx.font = `bold 16px Arial`; // Fixed size for error message
            const errorMsg = "Barcode Error";
            actualContentWidth = ctx.measureText(errorMsg).width;
            actualContentHeight = 16; // Approximate height for 16px text

            // Calculate position for the error message box
            elementWidth = actualContentWidth + 2 * padding;
            elementHeight = actualContentHeight + 2 * padding;
            if (position.includes('left')) elementX = marginX;
            else if (position.includes('right')) elementX = imageDisplayWidth - elementWidth - marginX;
            else elementX = (imageDisplayWidth - elementWidth) / 2; // Center X

            if (position.includes('top')) elementY = marginY;
            else if (position.includes('bottom')) elementY = imageDisplayHeight - elementHeight - marginY;
            else elementY = (imageDisplayHeight - elementHeight) / 2; // Center Y

            if (position === 'center') { // Explicit center
                elementX = (imageDisplayWidth - elementWidth) / 2;
                elementY = (imageDisplayHeight - elementHeight) / 2;
            }
            // Draw background for error message
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(elementX, elementY, elementWidth, elementHeight);
            // Draw error text
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(errorMsg, elementX + elementWidth / 2, elementY + elementHeight / 2);
            return; // Stop further drawing for this element
        }
    } else { // Plain text element
        ctx.font = `bold ${mainTextFontSize}px Arial`; // Use mainTextFontSize for text element
        const textMetrics = ctx.measureText(data);
        actualContentWidth = textMetrics.width;
        actualContentHeight = mainTextFontSize; // Height is based on font size
    }

    // Calculate overall element dimensions including padding
    elementWidth = actualContentWidth + 2 * padding;
    elementHeight = actualContentHeight + 2 * padding;

    // Calculate X position based on selected alignment
    if (position.includes('left')) elementX = marginX;
    else if (position.includes('right')) elementX = imageDisplayWidth - elementWidth - marginX;
    else elementX = (imageDisplayWidth - elementWidth) / 2; // Default to center X

    // Calculate Y position based on selected alignment
    if (position.includes('top')) elementY = marginY;
    else if (position.includes('bottom')) elementY = imageDisplayHeight - elementHeight - marginY;
    else elementY = (imageDisplayHeight - elementHeight) / 2; // Default to center Y
    
    // Explicit center position overrides
    if (position === 'center') {
        elementX = (imageDisplayWidth - elementWidth) / 2;
        elementY = (imageDisplayHeight - elementHeight) / 2;
    }

    // Draw background rectangle for the text/barcode
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Semi-transparent white background
    ctx.fillRect(elementX, elementY, elementWidth, elementHeight);
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.9)'; // Light gray border
    ctx.lineWidth = 1;
    ctx.strokeRect(elementX, elementY, elementWidth, elementHeight);

    // Calculate drawing position for the content (text or barcode) within the padded box
    const contentDrawX = elementX + padding;
    const contentDrawY = elementY + padding;

    if (drawBarcode) {
        // Re-generate barcode on a final canvas to draw with correct scaling
        // This ensures the barcode is crisp when drawn onto the main canvas.
        // The tempBarcodeCanvas was used for measurement, this one for drawing.
        const finalBarcodeCanvas = document.createElement('canvas');
        try {
            JsBarcode(finalBarcodeCanvas, data, {
                format: "CODE128", width: 2, height: 50, displayValue: true, 
                fontSize: mainTextFontSize, // MODIFIED: Use mainTextFontSize
                margin: 5 // Small margin within the barcode itself
            });
            if (finalBarcodeCanvas.width > 0 && finalBarcodeCanvas.height > 0) {
                 // Draw the generated barcode, scaling it to fit actualContentWidth/Height
                 ctx.drawImage(finalBarcodeCanvas, contentDrawX, contentDrawY, actualContentWidth, actualContentHeight);
            }
        } catch(e) { /* Error already handled by the first try-catch block for barcode generation */ }
    } else { // Plain text
        ctx.fillStyle = '#000000'; // Black text
        ctx.textAlign = 'center'; // Align text to the center of its calculated box
        ctx.textBaseline = 'middle'; // Align text vertically to the middle
        // Calculate center for text fill based on the padded element box
        const textDrawCenterX = elementX + elementWidth / 2;
        const textDrawCenterY = elementY + elementHeight / 2;
        ctx.fillText(data, textDrawCenterX, textDrawCenterY);
    }
}

function hasRequiredInputs() {
    return selectedImages.length > 0 && userText.trim() !== '' && selectedPosition;
}

function checkIfReadyToProcess() {
    processButton.disabled = !hasRequiredInputs();
}

function processImages() {
    if (!hasRequiredInputs()) {
        // Use a more user-friendly notification if possible, instead of alert.
        // For now, alert is used as per original structure.
        alert('Please select images, enter data, and choose a position before processing.');
        return;
    }
    processedImages = []; // Clear previous results
    gallery.innerHTML = ''; // Clear gallery
    progressContainer.style.display = 'block'; // Show progress
    progressBar.value = 0;
    progressTextEl.textContent = `Processing 0/${selectedImages.length} images...`;
    let processedCount = 0;
    let errorCount = 0;

    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.naturalWidth; // Use natural dimensions for processing
                tempCanvas.height = img.naturalHeight;
                const ctx = tempCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                
                // MODIFIED: Pass currentFontSize as the barcodeValFontSize argument
                // The last argument to drawElement is barcodeValFontSize, which now gets currentFontSize
                drawElement(ctx, userText, selectedPosition, tempCanvas.width, tempCanvas.height, currentFontSize, currentTextPadding, isBarcodeEnabled, currentBarcodeWidthPercentage, img.naturalWidth, currentFontSize); 
                
                const processedImageDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9); // Output as JPEG
                processedImages.push({ name: file.name, dataUrl: processedImageDataUrl });
                addImageToGallery(processedImageDataUrl, file.name); // Add to visual gallery
                
                processedCount++;
                progressBar.value = (processedCount / selectedImages.length) * 100;
                progressTextEl.textContent = `Processing ${processedCount}/${selectedImages.length} images...`;

                if (processedCount === selectedImages.length) { // All images (attempted) processed
                    if (errorCount > 0) {
                         progressTextEl.textContent = `Completed processing ${selectedImages.length - errorCount}/${selectedImages.length} images. ${errorCount} error(s).`;
                    } else {
                        progressTextEl.textContent = `Completed processing ${selectedImages.length} images!`;
                    }
                    if (downloadAllCheckbox.checked && processedImages.length > 0) {
                        downloadAllProcessedImages();
                    }
                }
            };
            img.onerror = function() {
                console.error("Error processing image:", file.name);
                errorCount++;
                processedCount++; // Still increment to complete the loop
                progressTextEl.textContent = `Error processing ${file.name}. Skipping. (${processedCount}/${selectedImages.length})`;
                 if (processedCount === selectedImages.length) { // All images (attempted) processed
                    if (errorCount === selectedImages.length) {
                        progressTextEl.textContent = `All ${errorCount} images failed to process.`;
                    } else {
                        progressTextEl.textContent = `Completed processing with ${errorCount} error(s).`;
                    }
                    if (downloadAllCheckbox.checked && processedImages.length > 0) {
                        downloadAllProcessedImages();
                    }
                }
            }
            img.src = event.target.result;
        };
        reader.onerror = function() { // FileReader error
            console.error("Error reading file:", file.name);
            errorCount++;
            processedCount++;
            progressTextEl.textContent = `Error reading ${file.name}. Skipping. (${processedCount}/${selectedImages.length})`;
            if (processedCount === selectedImages.length) {
                 if (errorCount === selectedImages.length) {
                        progressTextEl.textContent = `All ${errorCount} images failed to load.`;
                    } else {
                        progressTextEl.textContent = `Completed processing with ${errorCount} file reading error(s).`;
                    }
                if (downloadAllCheckbox.checked && processedImages.length > 0) {
                    downloadAllProcessedImages();
                }
            }
        };
        reader.readAsDataURL(file);
    });
}

function addImageToGallery(dataUrl, fileName) {
    const container = document.createElement('div');
    container.className = 'result-image-container';

    const imgEl = document.createElement('img');
    imgEl.src = dataUrl;
    imgEl.className = 'result-image';
    imgEl.alt = `Processed: ${fileName}`;
    imgEl.title = fileName; // Show original filename on hover

    const downloadBtn = document.createElement('a');
    downloadBtn.href = dataUrl;
    // Sanitize filename for download
    const safeBaseName = fileName.substring(0, fileName.lastIndexOf('.')).replace(/[^\w\s-]/gi, '') || 'image';
    downloadBtn.download = `${safeBaseName}_stamped.jpg`;
    downloadBtn.textContent = 'Download';
    downloadBtn.className = 'download-btn';

    container.appendChild(imgEl);
    container.appendChild(downloadBtn);
    gallery.appendChild(container);
}

function downloadAllProcessedImages() {
    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
        console.error('JSZip or FileSaver libraries not loaded.');
        alert('Required libraries for ZIP download are missing.'); // User notification
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
        const imageData = image.dataUrl.replace(/^data:image\/(jpeg|png);base64,/, ""); // Strip base64 prefix
        // Sanitize filename for ZIP entry
        const safeBaseName = image.name.substring(0, image.name.lastIndexOf('.')).replace(/[^\w\s-]/gi, '') || 'image';
        zip.file(`${safeBaseName}_stamped.jpg`, imageData, { base64: true });
    });
    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Create a unique filename for the zip
            saveAs(content, `textstamped_images_${timestamp}.zip`);
            progressTextEl.textContent = `ZIP file with ${processedImages.length} images downloaded.`;
        })
        .catch(function(error) {
            console.error('Error creating ZIP file:', error);
            progressTextEl.textContent = `Error creating ZIP file. See console. Try downloading manually.`;
        });
}

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

    // Reset DOM elements
    if (imageInput) imageInput.value = ''; // Clear file input
    if (textInput) textInput.value = '';
    if (fontSizeInput) {
        fontSizeInput.value = currentFontSize;
        fontSizeInput.disabled = false; // Re-enable
        fontSizeInput.title = "Controls font size for plain text."; // Reset title
    }
    if (fontSizeInputLabel) { // Reset label text
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

    // Reset position buttons
    if (positionButtons) positionButtons.forEach(btn => btn.classList.remove('selected'));

    // Reset progress and gallery
    if (progressContainer) progressContainer.style.display = 'none';
    if (progressBar) progressBar.value = 0;
    if (progressTextEl) progressTextEl.textContent = 'Processing...'; // Default progress text
    if (gallery) gallery.innerHTML = ''; // Clear gallery

    // Reset preview canvas
    if (previewCanvas) {
        const ctx = previewCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCanvas.style.display = 'none'; // Hide preview
        previewCanvas.loadedImageObject = null; // Clear cached image
    }
    
    if (processButton) processButton.disabled = true; // Disable process button
    if (downloadAllCheckbox) downloadAllCheckbox.checked = true; // Reset download all option

    console.log('TextStamp Web application has been reset.');
}

function setupEventListeners() {
    if (imageInput) imageInput.addEventListener('change', handleImageSelection);
    if (textInput) textInput.addEventListener('input', handleTextChange);
    if (positionButtons) {
        positionButtons.forEach(button => button.addEventListener('click', handlePositionSelection));
    }
    if (fontSizeInput) fontSizeInput.addEventListener('change', handleFontSizeChange);
    if (textPaddingInput) textPaddingInput.addEventListener('change', handleTextPaddingChange);
    if (barcodeWidthSlider) barcodeWidthSlider.addEventListener('input', handleBarcodeWidthSliderChange);
    
    // Event listener for the dedicated barcode font size input is not strictly needed if it's always hidden/disabled
    // when the main font size input is used for barcodes.
    // if (barcodeValueFontSizeInput) barcodeValueFontSizeInput.addEventListener('change', handleBarcodeValueFontSizeChange);

    if (barcodeCheckbox) barcodeCheckbox.addEventListener('change', handleBarcodeCheckboxChange);
    if (processButton) processButton.addEventListener('click', processImages);
    if (resetButton) resetButton.addEventListener('click', resetApp);
    
    // Initial setup calls
    checkIfReadyToProcess(); // Set initial state of process button
    if (barcodeCheckbox) { // Initialize UI state related to barcode option
        handleBarcodeCheckboxChange({ target: barcodeCheckbox }); // Pass a mock event object
    }
    updatePreview(); // Initial call to setup/hide preview canvas
}

// Initialize event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', setupEventListeners);
