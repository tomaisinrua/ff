// Custom JS

document.addEventListener("DOMContentLoaded", function() {
    // Hide loading screen after 2 seconds
    setTimeout(function() {
        document.getElementById('loading-screen').style.display = 'none';
    }, 2000);

    // Light/Dark mode toggle
    const toggleButton = document.getElementById('toggle-mode');
    toggleButton.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        updateToggleButton();
    });

    // Initialize button text on page load
    updateToggleButton();

    // Fetch the images from images.json
    fetch('images.json')
        .then(response => response.json())
        .then(images => {
            buildGallery(images);
        })
        .catch(error => {
            console.error('Error loading images:', error);
        });

    // Easter egg trigger
    document.body.addEventListener('keydown', function(e) {
        if (e.key === 'F' || e.key === 'f') { // Press 'F' to reveal
            const easterEgg = document.getElementById('easter-egg');
            easterEgg.style.display = 'block';
            alert(easterEgg.textContent);
        }
    });
});

// Function to update the toggle button text
function updateToggleButton() {
    const toggleButton = document.getElementById('toggle-mode');
    if (document.body.classList.contains('dark-mode')) {
        toggleButton.textContent = 'Switch to Light Mode';
    } else {
        toggleButton.textContent = 'Switch to Dark Mode';
    }
}

// Function to build the gallery
function buildGallery(images) {
    const gallery = document.getElementById('gallery');

    // Determine the number of rows (half as many as before)
    const numRows = 5; // Adjust this value to set the number of rows
    const imagesPerRow = Math.ceil(images.length / numRows);

    // Split images into rows
    const rowImages = [];
    for (let i = 0; i < numRows; i++) {
        rowImages.push(images.slice(i * imagesPerRow, (i + 1) * imagesPerRow));
    }

    // Create rows
    rowImages.forEach((imageSet, rowIndex) => {
        const row = document.createElement('div');
        row.className = 'row';

        const imageRow = document.createElement('div');
        imageRow.className = 'image-row';

        // Create images
        imageSet.forEach(imageName => {
            const img = document.createElement('img');
            img.src = `images/${imageName}`;
            img.alt = `Fiadh Image`;

            // On click, expand the image
            img.addEventListener('click', function() {
                openModal(img.src);
            });

            imageRow.appendChild(img);
        });

        // Append the image row to the row container
        row.appendChild(imageRow);
        gallery.appendChild(row);

        // After images are loaded, adjust animation duration
        const imgs = imageRow.querySelectorAll('img');
        const loadPromises = Array.from(imgs).map(img => {
            return new Promise((resolve, reject) => {
                if (img.complete && img.naturalWidth !== 0) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = resolve; // Resolve even if image fails to load
                }
            });
        });

        Promise.all(loadPromises).then(() => {
            // Duplicate images to fill the scrolling area
            const initialRowWidth = imageRow.scrollWidth;
            const minDuplications = Math.ceil((window.innerWidth + initialRowWidth) / initialRowWidth);

            for (let i = 0; i < minDuplications; i++) {
                imageSet.forEach(imageName => {
                    const imgDup = document.createElement('img');
                    imgDup.src = `images/${imageName}`;
                    imgDup.alt = `Fiadh Image`;

                    // On click, expand the image
                    imgDup.addEventListener('click', function() {
                        openModal(imgDup.src);
                    });

                    imageRow.appendChild(imgDup);
                });
            }

            // Set animation properties
            const totalRowWidth = imageRow.scrollWidth;
            const speed = 30; // Adjust this value to change scrolling speed (pixels per second)
            const duration = totalRowWidth / speed;

            imageRow.style.animationDuration = `${duration}s`;
            imageRow.style.animationName = (rowIndex % 2 === 0) ? 'scroll-left' : 'scroll-right';
            imageRow.style.animationTimingFunction = 'linear';
            imageRow.style.animationIterationCount = 'infinite';

            // Adjust row height based on the number of rows
            const rowHeight = 100 / numRows;
            row.style.height = `${rowHeight}%`;
        });
    });
}

// Function to open image in modal
function openModal(src) {
    const modalHtml = `
    <div class="modal" tabindex="-1" role="dialog" id="image-modal">
      <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-body p-0">
            <img src="${src}" class="img-fluid w-100">
          </div>
        </div>
      </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    $('#image-modal').modal('show');
    $('#image-modal').on('hidden.bs.modal', function () {
        document.getElementById('image-modal').remove();
    });
}
