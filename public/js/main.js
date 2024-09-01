function updateImageSrc() {
  const img = document.getElementById('book-cover');
  if (window.innerWidth < 576) { // Small screen breakpoint
    img.src = `https://covers.openlibrary.org/b/isbn/<%= post.isbn %>-S.jpg`; // Different image for small screens
    alert("small screen");
  } else {
    img.src = `https://covers.openlibrary.org/b/isbn/<%= post.isbn %>-M.jpg`; // Default image
  }
}

// Initial check
updateImageSrc();

// Update image on resize
window.addEventListener('resize', updateImageSrc);