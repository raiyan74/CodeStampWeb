// Global variables
let selectedImages = [];
let userText = ''; // To store the text input by the user OR data for barcode
let selectedPosition = null;
let processedImages = [];
let currentFontSize = 24; // Default font size for text
let currentTextPadding = 10; // Default padding around the element (text or barcode)
let isBarcodeEnabled = false; // To track if barcode mode is active
let currentBarcodeWidthPercentage = 20; // ADDED: Default barcode width percentage

// DOM Elements
const imageInput = document.getElementById('image-input');
const textInput = document.getElementById('text-input');
const imageCountEl = document.getElementById('image-count');
const textInputStatusEl = document.getElementById('text-input-status');
const positionButtons = document.querySelectorAll('.position-button');
const positionValueEl = document.getElementById('position-value');
const fontSizeInput = document.getElementById('font-size-input');
const textPaddingInput = document.getElementById('text-padding-input');

// ADDED: Barcode width slider control DOM elements
const barcodeWidthSlider = document.getElementById('barcode-width-slider');
const barcodeWidthValueDisplay = document.getElementById('barcode-width-value-display');
const barcodeWidthSliderGroup = document.getElementById('barcode-width-slider-group'); // Container for visibility

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
    e.target.value = currentFontSize;
    updatePreview();
}

function handleTextPaddingChange(e) {
    currentTextPadding = parseInt(e.target.value, 10);
    if (isNaN(currentTextPadding) || currentTextPadding < 0) currentTextPadding = 0;
    if (currentTextPadding > 50) currentTextPadding = 50;
    e.target.value = currentTextPadding;
    updatePreview();
}

/**
 * ADDED: Handles changes in the barcode width slider.
 * @param {Event} e - The input event from the slider.
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

function handleBarcodeCheckboxChange(e) {
    isBarcodeEnabled = e.target.checked;
    if (isBarcodeEnabled) {
        barcodeStatusEl.textContent = 'Barcode (CODE128) will be used.';
        fontSizeInput.disabled = true;
        fontSizeInput.title = "Font size is not applicable for barcodes.";
        if (barcodeWidthSliderGroup) barcodeWidthSliderGroup.style.display = 'block';
        if (barcodeWidthSlider) barcodeWidthSlider.disabled = false;
    } else {
        barcodeStatusEl.textContent = '';
        fontSizeInput.disabled = false;
        fontSizeInput.title = "";
        if (barcodeWidthSliderGroup) barcodeWidthSliderGroup.style.display = 'none';
        if (barcodeWidthSlider) barcodeWidthSlider.disabled = true;
    }
    updatePreview();
}

function loadImageForPreview(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Store actual preview image dimensions for barcode calculation
            img.previewWidth = previewCanvas.parentElement.clientWidth * 0.9; // Approx
            img.previewHeight = 400; // Approx
            
            let newWidth = img.width;
            let newHeight = img.height;
            const maxWidth = previewCanvas.parentElement.clientWidth * 0.9;
            const maxHeight = 400;

            if (newWidth > maxWidth) {
                newHeight = (maxWidth / newWidth) * newHeight;
                newWidth = maxWidth;
            }
            if (newHeight > maxHeight) {
                newWidth = (maxHeight / newHeight) * newWidth;
                newHeight = maxHeight;
            }
            img.actualPreviewRenderWidth = newWidth; // Store the actual width used for preview rendering

            updatePreview(img);
        };
        img.onerror = function() {
            console.error("Error loading image for preview.");
            previewCanvas.style.display = 'none';
        }
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updatePreview(baseImage) {
    if (!baseImage && selectedImages.length > 0) {
        // If called without a baseImage (e.g. from text change), ensure the first image is loaded
        // and its preview dimensions are available for barcode scaling.
        const firstFile = selectedImages[0];
        if (firstFile) {
             // Check if the image object already exists with preview dimensions
            let existingImageObj = null;
            // This is a bit tricky; ideally, we'd have the image object readily available.
            // For simplicity, we'll re-trigger load if not. A more robust solution might cache image objects.
            if (previewCanvas.loadedImageObject && previewCanvas.loadedImageObject.src.startsWith('data:')) {
                existingImageObj = previewCanvas.loadedImageObject;
            }

            if (existingImageObj && typeof existingImageObj.actualPreviewRenderWidth !== 'undefined') {
                 // If we have it, just proceed to draw
                 drawPreviewCanvas(existingImageObj);
            } else {
                loadImageForPreview(firstFile); // This will eventually call updatePreview again with the image
            }
        }
        return;
    }
    
    if (!baseImage || !previewCanvas.getContext) {
        previewCanvas.style.display = 'none';
        return;
    }
    previewCanvas.loadedImageObject = baseImage; // Store for potential reuse
    drawPreviewCanvas(baseImage);
}


/**
 * Helper function to draw the preview canvas content.
 * @param {HTMLImageElement} baseImage - The image to draw, expected to have actualPreviewRenderWidth.
 */
function drawPreviewCanvas(baseImage) {
    previewCanvas.style.display = 'block';
    const ctx = previewCanvas.getContext('2d');

    // Use the pre-calculated actual render width for the preview image
    const canvasDisplayWidth = baseImage.actualPreviewRenderWidth || baseImage.width;
    // Calculate height to maintain aspect ratio based on actual render width
    const canvasDisplayHeight = (canvasDisplayWidth / baseImage.width) * baseImage.height;

    previewCanvas.width = canvasDisplayWidth;
    previewCanvas.height = canvasDisplayHeight;
    
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(baseImage, 0, 0, previewCanvas.width, previewCanvas.height);

    if (userText && selectedPosition) {
        // For preview, barcode width percentage is relative to the preview canvas width
        drawElement(ctx, userText, selectedPosition, previewCanvas.width, previewCanvas.height, currentFontSize, currentTextPadding, isBarcodeEnabled, currentBarcodeWidthPercentage, previewCanvas.width);
    }
}


/**
 * Draws either a text stamp or a barcode onto the provided canvas context.
 * @param {CanvasRenderingContext2D} ctx - The canvas 2D rendering context.
 * @param {string} data - The text or barcode data.
 * @param {string} position - The selected position (e.g., 'top-left').
 * @param {number} imageDisplayWidth - The width of the canvas area where the image is currently displayed.
 * @param {number} imageDisplayHeight - The height of the canvas area where the image is currently displayed.
 * @param {number} fontSize - The font size (for text mode).
 * @param {number} padding - The padding around the element.
 * @param {boolean} drawBarcode - True to draw a barcode, false to draw text.
 * @param {number} barcodeWidthPercent - Percentage of the imageDisplayWidth for the barcode.
 * @param {number} baseImageActualWidth - The actual width of the source image (preview or final) for percentage calculation.
 */
function drawElement(ctx, data, position, imageDisplayWidth, imageDisplayHeight, fontSize, padding, drawBarcode, barcodeWidthPercent, baseImageActualWidth) {
    const marginX = Math.max(10, imageDisplayWidth * 0.02);
    const marginY = Math.max(10, imageDisplayHeight * 0.02);
    let elementX, elementY, elementWidth, elementHeight;
    let actualContentWidth, actualContentHeight;

    if (drawBarcode) {
        let targetPercentage = barcodeWidthPercent;
        if (targetPercentage <= 0 && isBarcodeEnabled) { // Treat 0 as minimum if barcode is active
            targetPercentage = 5;
        } else if (targetPercentage < 5 && isBarcodeEnabled) {
             targetPercentage = 5; // Enforce 5% minimum
        }


        // Calculate target pixel width based on the baseImageActualWidth (full image or preview image width)
        const targetBarcodePixelWidth = baseImageActualWidth * (targetPercentage / 100);

        const tempBarcodeCanvas = document.createElement('canvas');
        try {
            // Generate barcode with a standard bar module width. Its actual size will be determined, then scaled.
            JsBarcode(tempBarcodeCanvas, data, {
                format: "CODE128",
                lineColor: "#000000",
                width: 2, // Standard bar module width for initial rendering
                height: 50, // Standard bar height for initial rendering (aspect ratio maintained by scaling)
                displayValue: true,
                fontSize: 16, // Font size for text below barcode
                margin: 5 // Small internal margin for JsBarcode, helps with scaling artifacts
            });

            if (tempBarcodeCanvas.width === 0) throw new Error("JsBarcode rendered a zero-width canvas.");

            const sourceBarcodeWidth = tempBarcodeCanvas.width;
            const sourceBarcodeHeight = tempBarcodeCanvas.height;
            
            const scaleFactor = targetBarcodePixelWidth / sourceBarcodeWidth;
            actualContentWidth = targetBarcodePixelWidth;
            actualContentHeight = sourceBarcodeHeight * scaleFactor;

             // Ensure minimum dimensions for scaled barcode to be visible
            if (actualContentWidth < 10) actualContentWidth = 10;
            if (actualContentHeight < 10) actualContentHeight = 10;


        } catch (e) {
            console.error("Barcode generation error:", e);
            ctx.fillStyle = 'red';
            ctx.font = `bold 16px Arial`;
            const errorMsg = "Barcode Error";
            actualContentWidth = ctx.measureText(errorMsg).width;
            actualContentHeight = 16; 

            elementWidth = actualContentWidth + 2 * padding;
            elementHeight = actualContentHeight + 2 * padding;

            if (position.includes('left')) elementX = marginX;
            else if (position.includes('right')) elementX = imageDisplayWidth - elementWidth - marginX;
            else elementX = (imageDisplayWidth - elementWidth) / 2;

            if (position.includes('top')) elementY = marginY;
            else if (position.includes('bottom')) elementY = imageDisplayHeight - elementHeight - marginY;
            else elementY = (imageDisplayHeight - elementHeight) / 2;
            
            if (position === 'center') {
                elementX = (imageDisplayWidth - elementWidth) / 2;
                elementY = (imageDisplayHeight - elementHeight) / 2;
            }
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(elementX, elementY, elementWidth, elementHeight);
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(errorMsg, elementX + elementWidth / 2, elementY + elementHeight / 2);
            return;
        }
    } else {
        ctx.font = `bold ${fontSize}px Arial`;
        const textMetrics = ctx.measureText(data);
        actualContentWidth = textMetrics.width;
        actualContentHeight = fontSize;
    }

    elementWidth = actualContentWidth + 2 * padding;
    elementHeight = actualContentHeight + 2 * padding;

    if (position.includes('left')) elementX = marginX;
    else if (position.includes('right')) elementX = imageDisplayWidth - elementWidth - marginX;
    else elementX = (imageDisplayWidth - elementWidth) / 2;

    if (position.includes('top')) elementY = marginY;
    else if (position.includes('bottom')) elementY = imageDisplayHeight - elementHeight - marginY;
    else elementY = (imageDisplayHeight - elementHeight) / 2;

    if (position === 'center') {
        elementX = (imageDisplayWidth - elementWidth) / 2;
        elementY = (imageDisplayHeight - elementHeight) / 2;
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(elementX, elementY, elementWidth, elementHeight);
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(elementX, elementY, elementWidth, elementHeight);

    const contentDrawX = elementX + padding;
    const contentDrawY = elementY + padding;

    if (drawBarcode) {
        // Re-generate barcode with original settings to get the source canvas
        const finalBarcodeCanvas = document.createElement('canvas');
        try {
            JsBarcode(finalBarcodeCanvas, data, {
                format: "CODE128", width: 2, height: 50, displayValue: true, fontSize: 16, margin: 5
            });
            // Draw the source barcode canvas scaled to actualContentWidth and actualContentHeight
            if (finalBarcodeCanvas.width > 0 && finalBarcodeCanvas.height > 0) {
                 ctx.drawImage(finalBarcodeCanvas, contentDrawX, contentDrawY, actualContentWidth, actualContentHeight);
            } else {
                console.warn("Final barcode canvas for drawing is zero-size.");
            }
        } catch(e) { /* Error already handled */ }

    } else {
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
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
        alert('Please select images, enter data, and choose a position before processing.');
        return;
    }
    processedImages = [];
    gallery.innerHTML = '';
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressTextEl.textContent = `Processing 0/${selectedImages.length} images...`;
    let processedCount = 0;

    selectedImages.forEach((file) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;
                const ctx = tempCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                
                // For final processing, barcode width percentage is relative to the original image width
                drawElement(ctx, userText, selectedPosition, tempCanvas.width, tempCanvas.height, currentFontSize, currentTextPadding, isBarcodeEnabled, currentBarcodeWidthPercentage, img.naturalWidth);
                
                const processedImageDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
                processedImages.push({ name: file.name, dataUrl: processedImageDataUrl });
                processedCount++;
                progressBar.value = (processedCount / selectedImages.length) * 100;
                progressTextEl.textContent = `Processing ${processedCount}/${selectedImages.length} images...`;
                addImageToGallery(processedImageDataUrl, file.name);
                if (processedCount === selectedImages.length) {
                    progressTextEl.textContent = `Completed processing ${selectedImages.length} images!`;
                    if (downloadAllCheckbox.checked) {
                        downloadAllProcessedImages();
                    }
                }
            };
            img.onerror = function() {
                console.error(`Error loading image: ${file.name}`);
                processedCount++;
                if (processedCount === selectedImages.length) {
                    progressTextEl.textContent = `Completed processing with some errors.`;
                    if (downloadAllCheckbox.checked) {
                        downloadAllProcessedImages();
                    }
                }
            }
            img.src = event.target.result;
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
    imgEl.title = fileName;
    const downloadBtn = document.createElement('a');
    downloadBtn.href = dataUrl;
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
        alert('Required libraries for ZIP download are missing.');
        progressTextEl.textContent = `Error: ZIP libraries not loaded.`;
        return;
    }
    if (processedImages.length === 0) {
        progressTextEl.textContent = 'No images processed to download.';
        return;
    }
    progressTextEl.textContent = `Creating ZIP archive with ${processedImages.length} images...`;
    const zip = new JSZip();
    processedImages.forEach((image) => {
        const imageData = image.dataUrl.replace(/^data:image\/(jpeg|png);base64,/, "");
        const safeBaseName = image.name.substring(0, image.name.lastIndexOf('.')).replace(/[^\w\s-]/gi, '') || 'image';
        zip.file(`${safeBaseName}_stamped.jpg`, imageData, { base64: true });
    });
    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            saveAs(content, `textstamped_images_${timestamp}.zip`);
            progressTextEl.textContent = `ZIP file with ${processedImages.length} images downloaded.`;
        })
        .catch(function(error) {
            console.error('Error creating ZIP file:', error);
            progressTextEl.textContent = `Error creating ZIP file. See console.`;
        });
}

function resetApp() {
    selectedImages = [];
    processedImages = [];
    userText = '';
    selectedPosition = null;
    isBarcodeEnabled = false;
    currentBarcodeWidthPercentage = 20; // Reset slider percentage

    if (imageInput) imageInput.value = '';
    if (textInput) textInput.value = '';
    if (fontSizeInput) {
        fontSizeInput.value = currentFontSize = 24;
        fontSizeInput.disabled = false;
        fontSizeInput.title = "";
    }
    if (textPaddingInput) textPaddingInput.value = currentTextPadding = 10;

    // Reset barcode width slider
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
    if (positionButtons) positionButtons.forEach(btn => btn.classList.remove('selected'));
    if (progressContainer) progressContainer.style.display = 'none';
    if (progressBar) progressBar.value = 0;
    if (progressTextEl) progressTextEl.textContent = 'Processing...';
    if (gallery) gallery.innerHTML = '';
    if (previewCanvas) {
        const ctx = previewCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCanvas.style.display = 'none';
        previewCanvas.loadedImageObject = null; // Clear cached image object
    }
    if (processButton) processButton.disabled = true;
    if (downloadAllCheckbox) downloadAllCheckbox.checked = true;
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
    
    // Event listener for barcode width slider
    if (barcodeWidthSlider) barcodeWidthSlider.addEventListener('input', handleBarcodeWidthSliderChange); // 'input' for live update

    if (barcodeCheckbox) barcodeCheckbox.addEventListener('change', handleBarcodeCheckboxChange);
    if (processButton) processButton.addEventListener('click', processImages);
    if (resetButton) resetButton.addEventListener('click', resetApp);
    
    checkIfReadyToProcess();
    // Initial setup for barcode input visibility
    if (barcodeCheckbox) {
        handleBarcodeCheckboxChange({ target: barcodeCheckbox }); // Set initial state based on checkbox
    }
    // Initial preview update can be simplified or removed if not strictly needed before user interaction
    // updatePreview(); // Call to draw an empty preview or based on cached state if any
}

document.addEventListener('DOMContentLoaded', setupEventListeners);
