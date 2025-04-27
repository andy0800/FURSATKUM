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

// Retrieve persisted video data or initialize
let videoQueue = JSON.parse(localStorage.getItem("videos")) || [];
let videoNames = JSON.parse(localStorage.getItem("videoNames")) || [];

const videoPlayer = document.getElementById("videoPlayer");
const videoList = document.getElementById("videoList");

/**
 * Iterates over selected files, uploads each to Firebase Storage
 * under the "videos" directory, fetches the download URL,
 * and updates localStorage and the UI.
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
 * Plays the first video in the queue.
 * After a video ends, it cycles to the back.
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
 * Shifts the first video to the end and plays the next.
 */
function skipNext() {
  if (videoQueue.length > 0) {
    videoQueue.push(videoQueue.shift());
    videoNames.push(videoNames.shift());
    playNextVideo();
  }
}

/**
 * Retrieves the last video in the queue and plays it.
 */
function skipPrevious() {
  if (videoQueue.length > 0) {
    videoQueue.unshift(videoQueue.pop());
    videoNames.unshift(videoNames.pop());
    playNextVideo();
  }
}

/**
 * Removes the selected video from the queue and updates the UI.
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
 * Toggles the visibility of the Media Management panel.
 */
function toggleMediaManagement() {
  console.log("toggleMediaManagement clicked");
  document.getElementById("mediaManagement").classList.toggle("hidden");
}

/**
 * Refreshes the Media Management list and enables drag-and-drop.
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

// On load, update list and start playback (if videos exist), and request fullscreen.
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

// Expose functions to global scope so inline onclick handlers work.
window.uploadVideos = uploadVideos;
window.skipNext = skipNext;
window.skipPrevious = skipPrevious;
window.toggleMediaManagement = toggleMediaManagement;
window.removeVideo = removeVideo;