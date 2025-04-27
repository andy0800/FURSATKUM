const IMGUR_CLIENT_ID = "96ba14b0ef97c48";
let videoQueue = JSON.parse(localStorage.getItem("videos")) || [];
let videoNames = JSON.parse(localStorage.getItem("videoNames")) || [];
let videoPlayer = document.getElementById("videoPlayer");
let videoList = document.getElementById("videoList");

function uploadVideos() {
    const videoInput = document.getElementById("videoInput");
    if (videoInput.files.length > 0) {
        [...videoInput.files].forEach((file) => {
            const formData = new FormData();
            formData.append("video", file);

            fetch("https://api.imgur.com/3/image", { 
                method: "POST",
                headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    videoQueue.push(data.data.link);
                    videoNames.push(file.name);
                    localStorage.setItem("videos", JSON.stringify(videoQueue));
                    localStorage.setItem("videoNames", JSON.stringify(videoNames));
                    updateVideoList();
                    if (videoQueue.length === 1) playNextVideo();
                }
            })
            .catch(error => console.error("Upload error:", error));
        });
    }
}

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

function skipNext() {
    if (videoQueue.length > 0) {
        videoQueue.push(videoQueue.shift());
        videoNames.push(videoNames.shift());
        playNextVideo();
    }
}

function skipPrevious() {
    if (videoQueue.length > 0) {
        videoQueue.unshift(videoQueue.pop());
        videoNames.unshift(videoNames.pop());
        playNextVideo();
    }
}

function removeVideo(index) {
    videoQueue.splice(index, 1);
    videoNames.splice(index, 1);
    localStorage.setItem("videos", JSON.stringify(videoQueue));
    localStorage.setItem("videoNames", JSON.stringify(videoNames));
    updateVideoList();
    if (videoQueue.length > 0) playNextVideo();
}

function toggleMediaManagement() {
    document.getElementById("mediaManagement").classList.toggle("hidden");
}

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
        let droppedIndex = event.target.closest(".video-item").dataset.index;
        
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

// **Fullscreen & Autoplay on Load**
window.onload = () => {
    if (videoQueue.length > 0) {
        updateVideoList();
        playNextVideo();

        // Request fullscreen on page load
        let videoContainer = document.querySelector(".circle");
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) { // Safari compatibility
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.msRequestFullscreen) { // Edge compatibility
            videoContainer.msRequestFullscreen();
        }
    }
};
