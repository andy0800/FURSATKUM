// Supabase configuration – replace the anon key with your own
const SUPABASE_URL = "https://msblnducngvuisxvyzib.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE";  // Replace with your actual anon key
// Initialize the Supabase client (the library was loaded via CDN in index.html)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// The name of the bucket you created in Supabase Storage
const bucketName = "videos";

// Maintain a video playback queue and their names – persisted in localStorage
let videoQueue = JSON.parse(localStorage.getItem("videos")) || [];
let videoNames = JSON.parse(localStorage.getItem("videoNames")) || [];

const videoPlayer = document.getElementById("videoPlayer");
const videoList = document.getElementById("videoList");

/**
 * uploadVideos() loops through selected video files,
 * uploads each to Supabase Storage, retrieves its public URL,
 * stores it in a local array and localStorage, and updates the UI.
 */
async function uploadVideos() {
  const videoInput = document.getElementById("videoInput");
  if (videoInput.files.length > 0) {
    for (const file of videoInput.files) {
      // Create a unique file name to avoid collisions.
      const fileName = `${Date.now()}-${file.name}`;
      
      // Upload the file to the specified bucket.
      const { data, error } = await supabaseClient
        .storage
        .from(bucketName)
        .upload(fileName, file);
      
      if (error) {
        console.error("Upload error:", error);
        continue;
      }
      
      // Retrieve the public URL for the uploaded file.
      const { publicURL, error: urlError } = supabaseClient
        .storage
        .from(bucketName)
        .getPublicUrl(data.path);
      
      if (urlError) {
        console.error("Error getting public URL:", urlError);
        continue;
      }
      
      if (publicURL) {
        console.log("Video Uploaded:", publicURL);
        videoQueue.push(publicURL);
        videoNames.push(file.name);
        localStorage.setItem("videos", JSON.stringify(videoQueue));
        localStorage.setItem("videoNames", JSON.stringify(videoNames));
        updateVideoList();
        if (videoQueue.length === 1) {
          playNextVideo();
        }
      }
    }
  }
}

/**
 * playNextVideo() starts video playback from the front of the queue.
 * When a video ends, it cycles it to the back and starts the next.
 */
function playNextVideo() {
  if (videoQueue.length > 0) {
    videoPlayer.src = videoQueue[0];
    videoPlayer.play();
    videoPlayer.onended = () => {
      videoQueue.push(videoQueue.shift());
      videoNames.push(videoNames.shift());
      playNextVideo();
    };
  }
}

/**
 * skipNext() moves current video to the end and plays the next.
 */
function skipNext() {
  if (videoQueue.length > 0) {
    videoQueue.push(videoQueue.shift());
    videoNames.push(videoNames.shift());
    playNextVideo();
  }
}

/**
 * skipPrevious() retrieves the last video and plays it.
 */
function skipPrevious() {
  if (videoQueue.length > 0) {
    videoQueue.unshift(videoQueue.pop());
    videoNames.unshift(videoNames.pop());
    playNextVideo();
  }
}

/**
 * removeVideo() deletes a video from the queue and updates localStorage.
 */
function removeVideo(index) {
  videoQueue.splice(index, 1);
  videoNames.splice(index, 1);
  localStorage.setItem("videos", JSON.stringify(videoQueue));
  localStorage.setItem("videoNames", JSON.stringify(videoNames));
  updateVideoList();
  if (videoQueue.length > 0) playNextVideo();
}

/**
 * toggleMediaManagement() shows/hides the media management panel.
 */
function toggleMediaManagement() {
  document.getElementById("mediaManagement").classList.toggle("hidden");
}

/**
 * updateVideoList() refreshes the list of videos in the Media Management panel.
 * It also sets up drag–and–drop functionality for reordering.
 */
function updateVideoList() {
  videoList.innerHTML = "";
  videoQueue.forEach((video, index) => {
    let listItem = document.createElement("div");
    listItem.className = "video-item";
    listItem.draggable = true;
    listItem.dataset.index = index;
    listItem.innerHTML = `
      <span>${videoNames[index]}</span>
      <button onclick="removeVideo(${index})">🗑️ Delete</button>
    `;
    listItem.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", index);
    });
    videoList.appendChild(listItem);
  });
  
  videoList.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  
  videoList.addEventListener("drop", (event) => {
    event.preventDefault();
    let draggedIndex = event.dataTransfer.getData("text/plain");
    let dropTarget = event.target.closest(".video-item");
    if (!dropTarget) return;
    let droppedIndex = dropTarget.dataset.index;
    if (draggedIndex !== undefined && droppedIndex !== undefined) {
      let tempVideo = videoQueue[draggedIndex];
      let tempName = videoNames[draggedIndex];
      videoQueue.splice(draggedIndex, 1);
      videoNames.splice(draggedIndex, 1);
      videoQueue.splice(droppedIndex, 0, tempVideo);
      videoNames.splice(droppedIndex, 0, tempName);
      localStorage.setItem("videos", JSON.stringify(videoQueue));
      localStorage.setItem("videoNames", JSON.stringify(videoNames));
      updateVideoList();
    }
  });
}

// When the page loads, update the list, start playback if there are videos,
// and attempt to switch the video container into fullscreen.
window.onload = () => {
  if (videoQueue.length > 0) {
    updateVideoList();
    playNextVideo();
    let videoContainer = document.querySelector(".circle");
    if (videoContainer.requestFullscreen) {
      videoContainer.requestFullscreen();
    } else if (videoContainer.webkitRequestFullscreen) {
      videoContainer.webkitRequestFullscreen();
    } else if (videoContainer.msRequestFullscreen) {
      videoContainer.msRequestFullscreen();
    }
  }
};