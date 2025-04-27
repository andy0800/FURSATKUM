// Firebase configuration with your data
const firebaseConfig = {
  apiKey: "AIzaSyCxs2dqhkoTrsUfZtqxH2EhZD7MqclNGf0",
  authDomain: "fursatkum-videos.firebaseapp.com",
  projectId: "fursatkum-videos",
  storageBucket: "fursatkum-videos.firebasestorage.app",
  messagingSenderId: "699158181842",
  appId: "1:699158181842:web:a55a2cdf6d76d15c8c3a0b",
  measurementId: "G-HCTPLVZ620"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();

// Retrieve persisted video data or initialize new arrays
let videoQueue = JSON.parse(localStorage.getItem("videos")) || [];
let videoNames = JSON.parse(localStorage.getItem("videoNames")) || [];

const videoPlayer = document.getElementById("videoPlayer");
const videoList = document.getElementById("videoList");

/**
 * uploadVideos()
 * Iterates over selected files, uploads each to Firebase Storage in the "videos" directory,
 * retrieves its download URL, and updates localStorage along with the UI.
 */
function uploadVideos() {
  const videoInput = document.getElementById("videoInput");
  if (videoInput.files.length > 0) {
    Array.from(videoInput.files).forEach(file => {
      console.log("Uploading file:", file.name);
      const fileName = `${Date.now()}-${file.name}`;
      const storageRef = storage.ref('videos/' + fileName);
      
      storageRef.put(file)
        .then(snapshot => snapshot.ref.getDownloadURL())
        .then(downloadURL => {
          console.log("Video Uploaded:", downloadURL);
          videoQueue.push(downloadURL);
          videoNames.push(file.name);
          localStorage.setItem("videos", JSON.stringify(videoQueue));
          localStorage.setItem("videoNames", JSON.stringify(videoNames));
          updateVideoList();
          if (videoQueue.length === 1) playNextVideo();
        })
        .catch(error => {
          console.error("Upload error:", error);
        });
    });
  }
}

/**
 * playNextVideo()
 * Plays the first video in the queue. When the video ends, cycles it to the back,
 * then plays the next video.
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
 * skipNext()
 * Moves the current video to the end of the queue and starts playback of the next video.
 */
function skipNext() {
  if (videoQueue.length > 0) {
    videoQueue.push(videoQueue.shift());
    videoNames.push(videoNames.shift());
    playNextVideo();
  }
}

/**
 * skipPrevious()
 * Retrieves the last video in the queue and starts its playback.
 */
function skipPrevious() {
  if (videoQueue.length > 0) {
    videoQueue.unshift(videoQueue.pop());
    videoNames.unshift(videoNames.pop());
    playNextVideo();
  }
}

/**
 * removeVideo(index)
 * Removes the video at the specified index from the queue, updates localStorage and the UI.
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
 * toggleMediaManagement()
 * Toggles the visibility of the Media Management panel.
 */
function toggleMediaManagement() {
  console.log("toggleMediaManagement clicked");
  document.getElementById("mediaManagement").classList.toggle("hidden");
}

/**
 * updateVideoList()
 * Refreshes the list of videos displayed in the Media Management panel,
 * and sets up drag-and-drop for reordering.
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

// On page load, update the video list, start playback if videos exist,
// and attempt to request fullscreen for the video container.
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

// Expose functions to the global scope so that inline onclick handlers work.
window.uploadVideos = uploadVideos;
window.skipNext = skipNext;
window.skipPrevious = skipPrevious;
window.toggleMediaManagement = toggleMediaManagement;
window.removeVideo = removeVideo;