// Configure your Cloudinary information
const cloudName = "dpjmzviqn";           // Replace with your actual Cloudinary cloud name
const unsignedPreset = "fursatkum_videos"; // Replace with the name you set for your unsigned upload preset

/**
 * uploadVideos uploads each selected video file to Cloudinary
 * using an unsigned upload preset. When a video is successfully
 * uploaded, its secure URL is logged and used here to update the video player.
 */
function uploadVideos() {
  const videoInput = document.getElementById("videoInput");
  if (videoInput.files.length > 0) {
    // Loop through each file selected
    Array.from(videoInput.files).forEach(file => {
      let formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", unsignedPreset);
      // Specify resource_type "video" to ensure proper handling by Cloudinary
      formData.append("resource_type", "video");

      // Make the POST request to Cloudinary's upload endpoint
      fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: "POST",
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          if (data.secure_url) {
            console.log("Video Uploaded:", data.secure_url);
            // For demonstration purposes, update the video player with the latest uploaded video.
            // In a full implementation you might store these URLs in a database or display them in a playlist.
            document.getElementById("videoPlayer").src = data.secure_url;
          } else {
            console.error("Upload error:", data);
          }
        })
        .catch(error => {
          console.error("Error during upload:", error);
        });
    });
  }
}