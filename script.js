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
const firestore = firebase.firestore();
const videosCollection = firestore.collection("videos");

// Maintain a central video queue (populated from Firestore)
let videoQueue = [];
let videoNames = [];

const videoPlayer = document.getElementById("videoPlayer");
const videoList = document.getElementById("videoList");

/**
 * uploadVideos()
 * Iterates over selected files, uploads each to Firebase Storage in the "videos" folder,
 * retrieves its download URL, and then saves the metadata (URL, file name) in Firestore.
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
          // Save metadata to Firestore
          videosCollection.add({
            url: downloadURL,
            name: file.name,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(() => {
            console.log("Metadata saved to Firestore.");
            // Optionally update local queue after a successful Firestore write.
            videoQueue.push(downloadURL);
            videoNames.push(file.name);
            updateVideoList();
            if (videoQueue.length === 1) {
              playNextVideo();
            }
          }).catch(error => {
            console.error("Error saving metadata to Firestore:", error);
          });
        })
        .catch(error => {
          console.error("Upload error:", error);
        });
    });
  }
}

/**
 * playNextVideo()
 * Plays the first video in the queue, then cycles the video to the back when it ends.
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
 * Moves the current video to the end of the queue and begins playback of the next.
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
 * removeVideo(index)
 * Removes the selected video from the queue, updates Firestore (if desired), and refreshes the UI.
 * (Note: In a full implementation you’d also remove it from Firestore.)
 */
function removeVideo(index) {
  videoQueue.splice(index, 1);
  videoNames.splice(index, 1);
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
 * Refreshes the Media Management list and sets up drag-and-drop for reordering.
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
      updateVideoList();
    }
  });
}

// On page load, query Firestore for the video metadata and rebuild the queue.
// This makes the video list globally available across devices.
window.onload = () => {
  // Query videos ordered by upload time
  videosCollection.orderBy('uploadedAt').get()
    .then(snapshot => {
      videoQueue = [];
      videoNames = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        videoQueue.push(data.url);
        videoNames.push(data.name);
      });
      updateVideoList();
      if (videoQueue.length > 0) {
        playNextVideo();
      }
    })
    .catch(error => {
      console.error("Error loading videos from Firestore:", error);
    });
  
  // Request fullscreen for the video container
  let videoContainer = document.querySelector(".circle");
  if (videoContainer.requestFullscreen) {
    videoContainer.requestFullscreen();
  } else if (videoContainer.webkitRequestFullscreen) { // Safari compatibility
    videoContainer.webkitRequestFullscreen();
  } else if (videoContainer.msRequestFullscreen) { // Edge compatibility
    videoContainer.msRequestFullscreen();
  }
};

// Expose functions globally so inline onclick handlers work
window.uploadVideos = uploadVideos;
window.skipNext = skipNext;
window.skipPrevious = skipPrevious;
window.toggleMediaManagement = toggleMediaManagement;
window.removeVideo = removeVideo;