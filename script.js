const welcomeScreen = document.getElementById('welcome-screen');
const cameraScreen = document.getElementById('camera-screen');
const resultScreen = document.getElementById('result-screen');
const welcomeButton = document.getElementById('welcome-button');
const cameraFeed = document.getElementById('camera-feed');
const canvas = document.getElementById('canvas');
const captureButton = document.getElementById('capture-button');
const photo1 = document.getElementById('photo1');
const photo2 = document.getElementById('photo2');
const photo3 = document.getElementById('photo3');
const downloadButton = document.getElementById('download-button');
const resetButton = document.getElementById('reset-button');
const filterOverlay = document.getElementById('filter-overlay'); //This is unused now, but kept for backward compatibility
const countdownTimer = document.getElementById('countdown-timer');

let stream;
let photos = [];
let photoCount = 0;
const totalPhotos = 3;

welcomeButton.addEventListener('click', () => {
    welcomeScreen.style.display = 'none';
    cameraScreen.style.display = 'block';
    startCamera();
});

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraFeed.srcObject = stream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Unable to access camera. Please check your permissions.");
    }
}

captureButton.addEventListener('click', () => {
    capturePhoto();
});

async function capturePhoto() {
    captureButton.disabled = true; // Disable during capture
    countdownTimer.innerText = '';

    await countdown(3); // 3-second countdown

    const context = canvas.getContext('2d');
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    context.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);

    // Get the image data from the canvas
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply a red tint to the image data
    for (let i = 0; i < data.length; i += 4) {
        // Red component: Increase, but don't exceed 255
        data[i] = Math.min(data[i] * 1.2, 255);  // Increase red slightly
        // Green component: Decrease slightly
        data[i + 1] = Math.max(data[i + 1] * 0.8, 0);  // Decrease green slightly
        // Blue component: Decrease slightly
        data[i + 2] = Math.max(data[i + 2] * 0.8, 0);  // Decrease blue slightly
    }

    // Put the modified image data back onto the canvas
    context.putImageData(imageData, 0, 0);

    const photoDataUrl = canvas.toDataURL('image/png');
    photos.push(photoDataUrl);

    if (photoCount === 0) {
        photo1.src = photoDataUrl;
    } else if (photoCount === 1) {
        photo2.src = photoDataUrl;
    } else if (photoCount === 2) {
        photo3.src = photoDataUrl;
    }

    //Visual Feedback
    cameraScreen.classList.add('captured'); //Add captured class for feedback
    await new Promise(resolve => setTimeout(resolve, 500)); //Wait for 0.5s
    cameraScreen.classList.remove('captured'); //Remove captured class

    photoCount++;
    captureButton.disabled = false; // Enable capture again

    if (photoCount >= totalPhotos) {
        stopCamera();
        cameraScreen.style.display = 'none';
        resultScreen.style.display = 'block';
    }

}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        cameraFeed.srcObject = null;
        stream = null;
    }
}

async function countdown(seconds) {
    return new Promise(resolve => {
        let count = seconds;
        countdownTimer.innerText = count;
        const interval = setInterval(() => {
            count--;
            countdownTimer.innerText = count;
            if (count <= 0) {
                clearInterval(interval);
                countdownTimer.innerText = '';
                resolve();
            }
        }, 1000);
    });
}

downloadButton.addEventListener('click', () => {
    downloadPhotoStrip();
});

resetButton.addEventListener('click', () => {
    resetPhotobooth();
});

async function downloadPhotoStrip() {
    const pastelBlue = '#ADD8E6';  // Pastel Blue color
    const pinkSquareColor = '#ADD8ec'; // Hot Pink color
    const imageWidth = 150;          // Size of each square
    const imageHeight = 150;

    // Create a temporary canvas to combine the photos
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = imageWidth;  // Width of one square
    combinedCanvas.height = imageHeight * 3;     // Height of three squares stacked vertically

    const combinedContext = combinedCanvas.getContext('2d');

    // Set background to pastel blue
    combinedContext.fillStyle = pastelBlue;
    combinedContext.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

    // Function to draw a photo within a pink square
    function drawPhotoInSquare(ctx, photoSrc, x, y, width, height, squareColor) {
        return new Promise(resolve => {
            // Create a temporary canvas to apply the filter

            const img = new Image();
            img.src = photoSrc;
            img.onload = () => {
                // Draw pink square
                ctx.fillStyle = squareColor;
                ctx.fillRect(x, y, width, height);

                // Draw photo (centered within the square) - adjust size as needed
                const photoWidth = width * 0.8;   //  80% of square
                const photoHeight = height * 0.8;  //  80% of square
                const photoX = x + (width - photoWidth) / 2;
                const photoY = y + (height - photoHeight) / 2;

                // Draw the image on the temp canvas
                ctx.drawImage(img, photoX, photoY, photoWidth, photoHeight);
                 // Now, draw the *filtered* canvas content onto the combined canvas


                resolve(); // Resolve the Promise when the image is loaded
            };
        });
    }

    // Use Promise.all to wait for all images to load
    await Promise.all([
        drawPhotoInSquare(combinedContext, photo1.src, 0, 0, imageWidth, imageHeight, pinkSquareColor), //Top Photo
        drawPhotoInSquare(combinedContext, photo2.src, 0, imageHeight, imageWidth, imageHeight, pinkSquareColor), //Middle Photo
        drawPhotoInSquare(combinedContext, photo3.src, 0, imageHeight * 2, imageWidth, imageHeight, pinkSquareColor)  //Bottom Photo
    ]);

    // Convert the combined canvas to a data URL
    const combinedImageDataURL = combinedCanvas.toDataURL('image/png');

    // Create a link element to trigger the download
    const downloadLink = document.createElement('a');
    downloadLink.href = combinedImageDataURL;
    downloadLink.download = 'photo_strip.png'; // Filename

    // Programmatically click the link to start the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
function resetPhotobooth() {
    photoCount = 0;
    photos = [];
    photo1.src = "";
    photo2.src = "";
    photo3.src = "";
    resultScreen.style.display = 'none';
    cameraScreen.style.display = 'block';
    startCamera();
}