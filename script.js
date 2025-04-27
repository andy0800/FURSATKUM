// Import Firebase Storage and Firestore functions
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-storage.js";
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.19.1/firebase-firestore.js";

// Retrieve the Firebase services from the global scope
const storage = window.firebaseStorage;
const db = window.firebaseDB;

let videoQueue = [];
let videoNames = [];
const videoPlayer = document.getElementById("videoPlayer");
const videoList = document.getElementById("videoList");

// Upload multiple videos to Firebase Storage and add their info to Firestore
export async function uploadVideos() {
  const videoInput = document.getElementById("videoInput");
  if (videoInput.files.length > 0) {
    for (const file of videoInput.files) {
      const storageRef = ref(storage, `videos/${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const videoURL = await getDownloadURL(storageRef);
        // Save video URL and name to Firestore
        await addDoc(collection(db, "videos"), { url: videoURL, name: file.name });
        console.log(`Uploaded: ${file.name} (${videoURL})`);
      } catch (error) {
        console.error("Upload error:", error);
      }
    }
    loadVideos();
  }
}

// Load all videos from Firestore so they persist across visits
export async function loadVideos() {
  const querySnapshot = await getDocs(collection(db, "videos"));
  videoQueue = [];
  videoNames = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    videoQueue.push(data.url);
    videoNames.push(data.name);
  });
  if (videoQueue.length > 0) {
    playNextVideo();
    updateVideoList();
  }
}

// Continuously play videos in order
export function playNextVideo() {
  if (videoQueue.length > 0) {
    videoPlayer.src = videoQueue[0];
    videoPlayer.play();
    videoPlayer.onended = () => {
      videoQueue.push(videoQueue.shift());
      videoNames.push(videoNames.shift());
      updateVideoList();
      playNextVideo();
    };
  }
}

// Skip forward
export function skipNext() {
  if (videoQueue.length > 0) {
    videoQueue.push(videoQueue.shift());
    videoNames.push(videoNames.shift());
    playNextVideo();
  }
}

// Skip backward
export function skipPrevious() {
  if (videoQueue.length > 0) {
    videoQueue.unshift(videoQueue.pop());
    videoNames.unshift(videoNames.pop());
    playNextVideo();
  }
}

// Toggle visibility of the Media Management panel
export function toggleMediaManagement() {
  document.getElementById("mediaManagement").classList.toggle("hidden");
}

// Update the Media Management list with draggable video items
export function updateVideoList() {
  videoList.innerHTML = "";
  videoQueue.forEach((video, index) => {
    let listItem = document.createElement("div");
    listItem.className = "video-item";
    listItem.draggable = true;
    listItem.dataset.index = index;
    listItem.innerHTML = `<span>${videoNames[index]}</span>
      <button onclick="removeVideo(${index})">🗑️ Delete</button>`;
    
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

// Remove a video from the local playlist (Firestore deletion can be added separately)
export function removeVideo(index) {
  videoQueue.splice(index, 1);
  videoNames.splice(index, 1);
  updateVideoList();
  if (videoQueue.length > 0) playNextVideo();
}

// On initial load, load videos and request fullscreen for the video container
window.onload = () => {
  loadVideos();

  // Attempt to switch the video container to fullscreen
  let videoContainer = document.querySelector(".circle");
  if (videoContainer.requestFullscreen) {
    videoContainer.requestFullscreen();
  } else if (videoContainer.webkitRequestFullscreen) {
    videoContainer.webkitRequestFullscreen();
  } else if (videoContainer.msRequestFullscreen) {
    videoContainer.msRequestFullscreen();
  }
};

// Expose functions to the global scope for inline HTML handlers
window.uploadVideos = uploadVideos;
window.skipNext = skipNext;
window.skipPrevious = skipPrevious;
window.toggleMediaManagement = toggleMediaManagement;
window.removeVideo = removeVideo;