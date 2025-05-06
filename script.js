// Global variables
let selectedImages = [];
let userText = ''; // To store the text input by the user
let selectedPosition = null;
let processedImages = [];
let currentFontSize = 24; // Default font size
let currentTextPadding = 10; // Default padding

// DOM Elements
const imageInput = document.getElementById('image-input');
const textInput = document.getElementById('text-input'); // New text input field
const imageCountEl = document.getElementById('image-count');
const textInputStatusEl = document.getElementById('text-input-status'); // For text input feedback
const positionButtons = document.querySelectorAll('.position-button');
const positionValueEl = document.getElementById('position-value');
const fontSizeInput = document.getElementById('font-size-input');
const textPaddingInput = document.getElementById('text-padding-input');
const previewCanvas = document.getElementById('preview-canvas');
const processButton = document.getElementById('process-button');
const downloadAllCheckbox = document.getElementById('download-all-checkbox');
const progressContainer = document.querySelector('.progress-container');
const progressBar = document.getElementById('progress-bar');
const progressTextEl = document.getElementById('progress-text'); // Renamed for clarity
const gallery = document.getElementById('gallery');
const resetButton = document.getElementById('reset-button');

// --- Functions ---

// Handle image selection
function handleImageSelection(e) {
    selectedImages = Array.from(e.target.files);
    imageCountEl.textContent = `Selected ${selectedImages.length} image(s)`;
    
    if (selectedImages.length > 0) {
        loadImageForPreview(selectedImages[0]); // Load first image for preview
    } else {
        previewCanvas.style.display = 'none'; // Hide preview if no images
    }
    checkIfReadyToProcess();
}

// Handle text input changes
function handleTextChange(e) {
    userText = e.target.value.trim();
    if (userText) {
        textInputStatusEl.textContent = `Text to add: "${userText}"`;
    } else {
        textInputStatusEl.textContent = 'No text entered.';
    }
    updatePreview();
    checkIfReadyToProcess();
}

// Handle position selection
function handlePositionSelection() {
    positionButtons.forEach(btn => btn.classList.remove('selected'));
    this.classList.add('selected');
    selectedPosition = this.getAttribute('data-position');
    positionValueEl.textContent = `Selected Position: ${selectedPosition.replace('-', ' ')}`;
    updatePreview();
    checkIfReadyToProcess();
}

// Handle font size change
function handleFontSizeChange(e) {
    currentFontSize = parseInt(e.target.value, 10);
    if (isNaN(currentFontSize) || currentFontSize < 10) currentFontSize = 10;
    if (currentFontSize > 100) currentFontSize = 100;
    e.target.value = currentFontSize; // Update input if value was corrected
    updatePreview();
}

// Handle text padding change
function handleTextPaddingChange(e) {
    currentTextPadding = parseInt(e.target.value, 10);
    if (isNaN(currentTextPadding) || currentTextPadding < 0) currentTextPadding = 0;
    if (currentTextPadding > 50) currentTextPadding = 50;
    e.target.value = currentTextPadding; // Update input if value was corrected
    updatePreview();
}


// Load an image file for the preview canvas
function loadImageForPreview(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            updatePreview(img); // Pass the loaded image to updatePreview
        };
        img.onerror = function() {
            console.error("Error loading image for preview.");
            previewCanvas.style.display = 'none';
        }
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Update the preview canvas
function updatePreview(baseImage) {
    // If baseImage is not provided, try to use the first selected image
    if (!baseImage && selectedImages.length > 0) {
        // This path should ideally be hit only if text/position changes without a new image load
        // For simplicity, we re-trigger load if canvas is not already showing an image.
        // A more robust solution might cache the preview image object.
        loadImageForPreview(selectedImages[0]);
        return; // loadImageForPreview will call updatePreview again
    }

    if (!baseImage || !previewCanvas.getContext) {
        previewCanvas.style.display = 'none';
        return;
    }
    
    previewCanvas.style.display = 'block';
    const ctx = previewCanvas.getContext('2d');

    // Set canvas dimensions based on the base image, maintaining aspect ratio
    const maxWidth = previewCanvas.parentElement.clientWidth * 0.9; // Max width for preview
    const maxHeight = 400; // Max height for preview
    let newWidth = baseImage.width;
    let newHeight = baseImage.height;

    if (newWidth > maxWidth) {
        newHeight = (maxWidth / newWidth) * newHeight;
        newWidth = maxWidth;
    }
    if (newHeight > maxHeight) {
        newWidth = (maxHeight / newHeight) * newWidth;
        newHeight = maxHeight;
    }
    previewCanvas.width = newWidth;
    previewCanvas.height = newHeight;
    
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.drawImage(baseImage, 0, 0, previewCanvas.width, previewCanvas.height); // Draw base image scaled

    // If text and position are selected, draw the text stamp
    if (userText && selectedPosition) {
        drawTextStamp(ctx, userText, selectedPosition, previewCanvas.width, previewCanvas.height, currentFontSize, currentTextPadding);
    }
}

// Helper function to draw the text stamp (white square + text)
function drawTextStamp(ctx, text, position, canvasWidth, canvasHeight, fontSize, padding) {
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    // Actual ascent and descent might be more accurate if available, otherwise estimate height
    const textHeight = fontSize; // Approximation

    const rectWidth = textWidth + 2 * padding;
    const rectHeight = textHeight + 2 * padding;
    let rectX, rectY;

    // Calculate position for the rectangle (and text)
    const margin = 0.05 * Math.min(canvasWidth, canvasHeight); // 5% margin

    switch (position) {
        case 'top-left':
            rectX = margin;
            rectY = margin;
            break;
        case 'top-right':
            rectX = canvasWidth - rectWidth - margin;
            rectY = margin;
            break;
        case 'bottom-left':
            rectX = margin;
            rectY = canvasHeight - rectHeight - margin;
            break;
        case 'bottom-right':
            rectX = canvasWidth - rectWidth - margin;
            rectY = canvasHeight - rectHeight - margin;
            break;
        case 'center':
            rectX = (canvasWidth - rectWidth) / 2;
            rectY = (canvasHeight - rectHeight) / 2;
            break;
        default: // Default to bottom-right if somehow no position
            rectX = canvasWidth - rectWidth - margin;
            rectY = canvasHeight - rectHeight - margin;
    }

    // Draw white rectangle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // White with slight transparency
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.9)'; // Light grey border for the white box
    ctx.lineWidth = 1;
    ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);


    // Draw text on the rectangle
    ctx.fillStyle = '#000000'; // Black text
    // Adjust text position to be centered within the rectangle
    const textDrawX = rectX + rectWidth / 2;
    const textDrawY = rectY + rectHeight / 2;
    ctx.fillText(text, textDrawX, textDrawY);
}


// Check if all required inputs are filled to enable processing
function hasRequiredInputs() {
    return selectedImages.length > 0 && userText.trim() !== '' && selectedPosition;
}

function checkIfReadyToProcess() {
    processButton.disabled = !hasRequiredInputs();
}

// Process all selected images
function processImages() {
    if (!hasRequiredInputs()) {
        alert('Please select images, enter text, and choose a position before processing.');
        return;
    }
    
    processedImages = []; // Clear previous results
    gallery.innerHTML = ''; // Clear the gallery display
    
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressTextEl.textContent = `Processing 0/${selectedImages.length} images...`;
    
    let processedCount = 0;
    
    selectedImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Use original image dimensions for processing canvas
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = img.naturalWidth; // Use natural dimensions for full quality
                tempCanvas.height = img.naturalHeight;
                const ctx = tempCanvas.getContext('2d');
                
                ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height); // Draw original image
                
                // Draw the text stamp using the helper function
                drawTextStamp(ctx, userText, selectedPosition, tempCanvas.width, tempCanvas.height, currentFontSize, currentTextPadding);
                
                const processedImageDataUrl = tempCanvas.toDataURL('image/jpeg', 0.9); // JPEG quality 0.9
                
                processedImages.push({
                    name: file.name,
                    dataUrl: processedImageDataUrl
                });
                
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
                processedCount++; // Still count it to not hang progress
                 if (processedCount === selectedImages.length) {
                    progressTextEl.textContent = `Completed processing with some errors.`;
                     if (downloadAllCheckbox.checked) {
                        downloadAllProcessedImages(); // Download what was successful
                    }
                }
            }
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Add a processed image to the gallery
function addImageToGallery(dataUrl, fileName) {
    const container = document.createElement('div');
    container.className = 'result-image-container'; // For styling wrapper
    
    const imgEl = document.createElement('img');
    imgEl.src = dataUrl;
    imgEl.className = 'result-image';
    imgEl.alt = `Processed: ${fileName}`; // Alt text for accessibility
    imgEl.title = fileName;
    
    const downloadBtn = document.createElement('a');
    downloadBtn.href = dataUrl;
    // Ensure filename is safe and ends with .jpg
    const safeBaseName = fileName.substring(0, fileName.lastIndexOf('.')).replace(/[^\w\s-]/gi, '') || 'image';
    downloadBtn.download = `${safeBaseName}_stamped.jpg`;
    downloadBtn.textContent = 'Download';
    downloadBtn.className = 'download-btn'; // For styling
    
    container.appendChild(imgEl);
    container.appendChild(downloadBtn);
    gallery.appendChild(container);
}

// Download all processed images as a ZIP file
function downloadAllProcessedImages() {
    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
        console.error('JSZip or FileSaver libraries not loaded.');
        alert('Required libraries for ZIP download are missing.');
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
        zip.file(`${safeBaseName}_stamped.jpg`, imageData, {base64: true});
    });
    
    zip.generateAsync({type:"blob"})
        .then(function(content) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            saveAs(content, `textstamped_images_${timestamp}.zip`);
            progressTextEl.textContent = `ZIP file with ${processedImages.length} images downloaded.`;
            // Consider calling cleanupMemory() here or after a short delay
        })
        .catch(function(error) {
            console.error('Error creating ZIP file:', error);
            progressTextEl.textContent = `Error creating ZIP file. See console.`;
        });
}

// Reset the application state
function resetApp() {
    // Clear data arrays
    selectedImages = [];
    processedImages = [];
    userText = '';
    selectedPosition = null;
    
    // Reset input fields
    if (imageInput) imageInput.value = '';
    if (textInput) textInput.value = '';
    if (fontSizeInput) fontSizeInput.value = currentFontSize = 24; // Reset to default
    if (textPaddingInput) textPaddingInput.value = currentTextPadding = 10; // Reset to default
    
    // Reset UI text elements
    if (imageCountEl) imageCountEl.textContent = '';
    if (textInputStatusEl) textInputStatusEl.textContent = '';
    if (positionValueEl) positionValueEl.textContent = 'Selected Position: None';
    
    // Clear position button selection
    if (positionButtons) positionButtons.forEach(btn => btn.classList.remove('selected'));
    
    // Hide/reset progress and gallery
    if (progressContainer) progressContainer.style.display = 'none';
    if (progressBar) progressBar.value = 0;
    if (progressTextEl) progressTextEl.textContent = 'Processing...';
    if (gallery) gallery.innerHTML = '';
    
    // Hide preview canvas
    if (previewCanvas) {
        const ctx = previewCanvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCanvas.style.display = 'none';
    }
    
    // Disable process button
    if (processButton) processButton.disabled = true;

    // Reset checkbox
    if(downloadAllCheckbox) downloadAllCheckbox.checked = true;
    
    console.log('TextStamp Web application has been reset.');
}


// Setup all event listeners when the DOM is fully loaded
function setupEventListeners() {
    if (imageInput) imageInput.addEventListener('change', handleImageSelection);
    if (textInput) textInput.addEventListener('input', handleTextChange); // 'input' for live updates
    
    if (positionButtons) {
        positionButtons.forEach(button => {
            button.addEventListener('click', handlePositionSelection);
        });
    }

    if (fontSizeInput) fontSizeInput.addEventListener('change', handleFontSizeChange);
    if (textPaddingInput) textPaddingInput.addEventListener('change', handleTextPaddingChange);
    
    if (processButton) processButton.addEventListener('click', processImages);
    if (resetButton) resetButton.addEventListener('click', resetApp);
    
    // Initial check
    checkIfReadyToProcess();
    // Initial preview update if there's pre-filled data (e.g. browser cache)
    if (selectedImages.length > 0) loadImageForPreview(selectedImages[0]);
    else updatePreview(); 
}

// Initialize the application
document.addEventListener('DOMContentLoaded', setupEventListeners);
