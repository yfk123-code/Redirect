// --- DOM Element Selection ---
const fileInput = document.getElementById('fileInput');
const fileNameDisplay = document.getElementById('fileName');
const processButton = document.getElementById('processButton');
const loader = document.getElementById('loader');
const resultsArea = document.getElementById('resultsArea');
const fileViewer = document.getElementById('fileViewer');
const textEditor = document.getElementById('textEditor');
const copyTextButton = document.getElementById('copyTextButton');

// --- Gemini API Configuration ---
// IMPORTANT: Replace with your actual Gemini API Key
const GEMINI_API_KEY = 'AIzaSyCGVAXZPozOUUCFMJXKjPKx2lA5w-tfpdU'; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`;

// --- Event Listeners ---

// Update file name display when a file is chosen
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = fileInput.files[0].name;
    } else {
        fileNameDisplay.textContent = 'No file chosen';
    }
});

// Main process when "Extract Text" button is clicked
processButton.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a file first.');
        return;
    }
    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
        alert('Please enter your Gemini API Key in the script.js file.');
        return;
    }

    // Reset UI and show loader
    resultsArea.classList.add('hidden');
    loader.classList.remove('hidden');
    textEditor.value = '';
    fileViewer.innerHTML = '';

    const fileType = file.type;

    try {
        if (fileType.startsWith('image/')) {
            await handleImageFile(file);
        } else if (fileType === 'application/pdf') {
            await handlePdfFile(file);
        } else {
            throw new Error('Unsupported file type. Please use an image or PDF.');
        }
    } catch (error) {
        alert(`An error occurred: ${error.message}`);
        loader.classList.add('hidden');
    }
});

copyTextButton.addEventListener('click', () => {
    if (textEditor.value) {
        navigator.clipboard.writeText(textEditor.value)
            .then(() => alert('Text copied to clipboard!'))
            .catch(err => alert('Failed to copy text.'));
    }
});


// --- File Handling Functions ---

/**
 * Handles image files by displaying them and extracting text.
 * @param {File} file - The image file to process.
 */
async function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        // Display the image preview
        fileViewer.innerHTML = `<img src="${e.target.result}" alt="Image preview">`;
        // Extract Base64 data for the API
        const base64Image = e.target.result.split(',')[1];
        await extractTextFromImage(base64Image, file.type);
    };
    reader.readAsDataURL(file);
}

/**
 * Handles PDF files by rendering the first page to a canvas,
 * displaying it, and extracting text from it.
 * @param {File} file - The PDF file to process.
 */
async function handlePdfFile(file) {
    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
        const typedarray = new Uint8Array(e.target.result);
        
        // Use PDF.js to load the document
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        const page = await pdf.getPage(1); // Get the first page
        
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Create a canvas to render the PDF page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render the page onto the canvas
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        // Display the rendered page
        fileViewer.innerHTML = '';
        fileViewer.appendChild(canvas);
        
        // Convert canvas to Base64 image and extract text
        const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
        await extractTextFromImage(base64Image, 'image/jpeg');
    };
    fileReader.readAsArrayBuffer(file);
}


// --- API Interaction ---

/**
 * Sends image data to the Gemini API and populates the text editor.
 * @param {string} base64Image - The Base64 encoded image data.
 * @param {string} mimeType - The MIME type of the image (e.g., 'image/jpeg').
 */
async function extractTextFromImage(base64Image, mimeType) {
    textEditor.value = 'Extracting text...';

    const payload = {
        "contents": [{
            "parts": [
                { "text": "Extract all text from this image, maintaining the original structure and paragraphs." },
                { "inline_data": { "mime_type": mimeType, "data": base64Image } }
            ]
        }]
    };

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error.message}`);
        }

        const data = await response.json();
        const extractedText = data.candidates[0].content.parts[0].text;
        textEditor.value = extractedText;
        
    } catch (error) {
        console.error('Error during text extraction:', error);
        textEditor.value = `Failed to extract text. ${error.message}`;
    } finally {
        // Hide loader and show results
        loader.classList.add('hidden');
        resultsArea.classList.remove('hidden');
    }
}
