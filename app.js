document.addEventListener("DOMContentLoaded", function () {
  // Check authentication first
  checkAuthentication();
  
  // Populate secretaries (dashboard view) and the secretary dropdown.
  loadSecretaries();
  loadSecretaryOptions();
  // Also load the filtered visas (all visas from all secretaries) into "Expiring Soon"
  loadFilteredVisas();
  // Load cancelled and arrived visas
  loadCancelledVisas();
  loadArrivedVisas();
});

// Authentication check
function checkAuthentication() {
  const currentUser = localStorage.getItem('currentUser');
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }
  // Display current user
  displayCurrentUser();
}

function displayCurrentUser() {
  const currentUserElement = document.getElementById('currentUser');
  if (currentUserElement) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    currentUserElement.textContent = `Welcome, ${currentUser.username || 'User'}`;
  }
}

// Select DOM elements.
const secretaryList = document.getElementById("secretariesList"); // List-group for secretaries.
const secretarySelect = document.getElementById("secretarySelect");
// For the Maid Visas tab
const visaList = document.getElementById("maidVisasList");
// For the Expiring Soon tab (we use a list)
const filteredVisaList = document.getElementById("expiringVisaList");
// For the Cancelled tab
const cancelledVisaList = document.getElementById("cancelledVisaList");
// For the Arrived tab
const arrivedVisaList = document.getElementById("arrivedVisaList");

// Load secretaries as list-group items.
function loadSecretaries() {
  db.collection("secretaries")
    .get()
    .then((querySnapshot) => {
      secretaryList.innerHTML = "";
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement("li");
        li.className = "list-group-item list-group-item-success";
        li.textContent = data.name;
        // When clicked, load the visas for this secretary and switch to the "Maid Visas" tab.
        li.onclick = function () {
          loadVisasForSecretary(doc.id);
          $('#maid-visas-manage-tab').tab('show');
        };
        secretaryList.appendChild(li);
      });
    })
    .catch((error) => console.error("Error fetching secretaries:", error));
}

// Populate the secretary select dropdown in the Maid Visa form.
function loadSecretaryOptions() {
  db.collection("secretaries")
    .get()
    .then((querySnapshot) => {
      secretarySelect.innerHTML = `<option value="">-- Choose Secretary --</option>`;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = data.name;
        secretarySelect.appendChild(option);
      });
    })
    .catch((error) => console.error("Error loading secretary options:", error));
}

// Load the maid visas for a given secretary into the "Maid Visas" tab.
function loadVisasForSecretary(secretaryId) {
  db.collection("secretaries")
    .doc(secretaryId)
    .collection("visas")
    .get() // Load all visas regardless of status
    .then((querySnapshot) => {
      visaList.innerHTML = "";
      if (querySnapshot.empty) {
        visaList.innerHTML = "<li class='list-group-item'>No visas found for this secretary.</li>";
        console.warn("No visas found for secretary ID:", secretaryId);
        return;
      }
      querySnapshot.forEach((doc) => {
        const visa = doc.data();
        // Set default status if not present
        if (!visa.status) {
          visa.status = "active";
        }
        const li = createVisaListItem(visa, doc.id, secretaryId);
        visaList.appendChild(li);
      });
    })
    .catch((error) => console.error("Error loading visas for secretary:", error));
}

// Load cancelled visas
function loadCancelledVisas() {
  let allCancelledVisas = [];
  db.collection("secretaries")
    .get()
    .then((querySnapshot) => {
      const promises = [];
      querySnapshot.forEach((secretaryDoc) => {
        promises.push(
          db.collection("secretaries")
            .doc(secretaryDoc.id)
            .collection("visas")
            .get() // Load all visas first
        );
      });
      return Promise.all(promises);
    })
    .then((results) => {
      results.forEach((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          const visa = doc.data();
          // Only include cancelled visas
          if (visa.status === "cancelled") {
            allCancelledVisas.push({...visa, id: doc.id, secretaryId: doc.ref.parent.parent.id});
          }
        });
      });
      displayCancelledVisas(allCancelledVisas);
    })
    .catch((error) => console.error("Error loading cancelled visas:", error));
}

// Load arrived visas
function loadArrivedVisas() {
  let allArrivedVisas = [];
  db.collection("secretaries")
    .get()
    .then((querySnapshot) => {
      const promises = [];
      querySnapshot.forEach((secretaryDoc) => {
        promises.push(
          db.collection("secretaries")
            .doc(secretaryDoc.id)
            .collection("visas")
            .get() // Load all visas first
        );
      });
      return Promise.all(promises);
    })
    .then((results) => {
      results.forEach((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          const visa = doc.data();
          // Only include arrived visas
          if (visa.status === "arrived") {
            allArrivedVisas.push({...visa, id: doc.id, secretaryId: doc.ref.parent.parent.id});
          }
        });
      });
      displayArrivedVisas(allArrivedVisas);
    })
    .catch((error) => console.error("Error loading arrived visas:", error));
}

// Display cancelled visas
function displayCancelledVisas(visas) {
  cancelledVisaList.innerHTML = "";
  if (visas.length === 0) {
    cancelledVisaList.innerHTML = "<li class='list-group-item'>No cancelled visas found.</li>";
    return;
  }
  visas.forEach((visa) => {
    const li = createVisaListItem(visa, visa.id, visa.secretaryId, true);
    cancelledVisaList.appendChild(li);
  });
}

// Display arrived visas
function displayArrivedVisas(visas) {
  arrivedVisaList.innerHTML = "";
  if (visas.length === 0) {
    arrivedVisaList.innerHTML = "<li class='list-group-item'>No arrived visas found.</li>";
    return;
  }
  visas.forEach((visa) => {
    const li = createVisaListItem(visa, visa.id, visa.secretaryId, false, true);
    arrivedVisaList.appendChild(li);
  });
}

// Create visa list item with action buttons
function createVisaListItem(visa, visaId, secretaryId, isCancelled = false, isArrived = false) {
  console.log("Creating visa list item:", { visa, visaId, secretaryId, isCancelled, isArrived });
  console.log("Visa image URL in createVisaListItem:", visa.visaImageUrl);
  console.log("Sponsor civil ID image URL in createVisaListItem:", visa.sponsorCivilIdImageUrl);
  
  const li = document.createElement("li");
  li.className = "list-group-item list-group-item-success";
  
  // Set default values for missing fields
  const visaData = {
    passportNumber: visa.passportNumber || "N/A",
    visaStartDate: visa.visaStartDate,
    expiryDate: visa.expiryDate,
    cancelDate: visa.cancelDate,
    arrivalDate: visa.arrivalDate,
    status: visa.status || "active"
  };
  
  console.log("Visa data with defaults:", visaData);
  
  let startText = "No start date";
  let endText = "No expiry date";
  let cancelDateText = "";
  let arrivalDateText = "";
  
  if (visaData.visaStartDate && visaData.visaStartDate.seconds) {
    startText = new Date(visaData.visaStartDate.seconds * 1000).toLocaleDateString();
  }
  if (visaData.expiryDate && visaData.expiryDate.seconds) {
    endText = new Date(visaData.expiryDate.seconds * 1000).toLocaleDateString();
  }
  if (visaData.cancelDate && visaData.cancelDate.seconds) {
    cancelDateText = ` | Cancelled: ${new Date(visaData.cancelDate.seconds * 1000).toLocaleDateString()}`;
  }
  if (visaData.arrivalDate && visaData.arrivalDate.seconds) {
    arrivalDateText = ` | Arrived: ${new Date(visaData.arrivalDate.seconds * 1000).toLocaleDateString()}`;
  }
  
  // Determine if visa should show action buttons
  const shouldShowActions = !isCancelled && !isArrived && visaData.status === "active";
  
  li.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <strong>Passport:</strong> ${visaData.passportNumber}<br>
        <small>Start Date: ${startText} | End Date: ${endText}${cancelDateText}${arrivalDateText}</small>
      </div>
      <div class="btn-group" role="group">
        <button class="btn btn-sm btn-info" onclick="viewVisaDetails('${encodeURIComponent(JSON.stringify(visa))}')" data-visa-id="${visaId}" title="View visa details">
          <i class="fas fa-eye mr-1"></i>View
        </button>
        ${shouldShowActions ? `
          <button class="btn btn-sm btn-warning" onclick="editVisa('${visaId}', '${secretaryId}')">
            <i class="fas fa-edit mr-1"></i>Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="cancelVisa('${visaId}', '${secretaryId}')">
            <i class="fas fa-times mr-1"></i>Cancel
          </button>
          <button class="btn btn-sm btn-success" onclick="markArrived('${visaId}', '${secretaryId}')">
            <i class="fas fa-check mr-1"></i>Arrived
          </button>
        ` : ''}
      </div>
    </div>
  `;
  
  return li;
}

// Load all visas (regardless of secretary) for the "Expiring Soon" tab,
// sort them by expiry (end) date in ascending order, and display that date.
// Only show visas expiring within 2 weeks
function loadFilteredVisas() {
  filteredVisaList.innerHTML = "";
  let allVisas = [];
  const twoWeeksFromNow = new Date();
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
  
  db.collection("secretaries")
    .get()
    .then((querySnapshot) => {
      const promises = [];
      querySnapshot.forEach((secretaryDoc) => {
        promises.push(
          db.collection("secretaries")
            .doc(secretaryDoc.id)
            .collection("visas")
            .get() // Load all visas first
        );
      });
      return Promise.all(promises);
    })
    .then((results) => {
      results.forEach((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          const visa = doc.data();
          // Set default status if not present
          if (!visa.status) {
            visa.status = "active";
          }
          // Only include active visas expiring within 2 weeks
          if (visa.status === "active" && visa.expiryDate && visa.expiryDate.seconds) {
            const expiryDate = new Date(visa.expiryDate.seconds * 1000);
            if (expiryDate <= twoWeeksFromNow) {
              allVisas.push({...visa, id: doc.id, secretaryId: doc.ref.parent.parent.id});
            }
          }
        });
      });
      // Sort by expiry (end) date ascending.
      allVisas.sort((a, b) => {
        if (a.expiryDate && a.expiryDate.seconds && b.expiryDate && b.expiryDate.seconds) {
          return a.expiryDate.seconds - b.expiryDate.seconds;
        } else {
          return 0;
        }
      });
      if (allVisas.length === 0) {
        filteredVisaList.innerHTML = "<li class='list-group-item'>No visas expiring within 2 weeks.</li>";
        return;
      }
      allVisas.forEach((visa) => {
        const li = createVisaListItem(visa, visa.id, visa.secretaryId);
        filteredVisaList.appendChild(li);
      });
    })
    .catch((error) => console.error("Error loading filtered visas:", error));
}

// Secretary Form Submission.
document.getElementById("secretaryForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const secretaryName = document.getElementById("secretaryName").value;
  const secId = document.getElementById("secretaryId").value;
  if (secId) {
         db.collection("secretaries").doc(secId).update({ name: secretaryName })
              .then(() => {
          alert("Secretary updated successfully!");
          // Log the action
          logAction('Secretary Update', `Updated secretary: ${secretaryName}`);
          // Redirect to index page after successful update
          window.location.href = 'index.html';
        })
             .catch((error) => {
         console.error("Error updating secretary:", error);
         alert("Error updating secretary: " + error.message);
         // Don't reset the form on error - let user fix the issue
       });
   } else {
          db.collection("secretaries").add({ name: secretaryName })
               .then(() => {
           alert("Secretary added successfully!");
           // Log the action
           logAction('Secretary Creation', `Created secretary: ${secretaryName}`);
           // Redirect to index page after successful creation
           window.location.href = 'index.html';
         })
       .catch((error) => {
         console.error("Error adding secretary:", error);
         alert("Error adding secretary: " + error.message);
         // Don't reset the form on error - let user fix the issue
       });
   }
   // Only reset form on success (redirect will happen anyway)
});

// Enhanced Maid Visa Form Submission.
document.getElementById("maidVisaForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const selectedSec = secretarySelect.value;
  if (!selectedSec) {
    alert("Please select a secretary from the dropdown.");
    return;
  }
  
  // Get all form values
  const visaName = document.getElementById("maidName").value;
  const visaNumber = document.getElementById("visaNumber").value;
  const passportNumber = document.getElementById("passportNumber").value;
  const homeCountry = document.getElementById("homeCountry").value;
  const sponsorName = document.getElementById("sponsorName").value;
  const sponsorCivilId = document.getElementById("sponsorCivilId").value;
  const sponsorPhone = document.getElementById("sponsorPhone").value;
  const visaPrice = document.getElementById("visaPrice").value;
  const visaVendor = document.getElementById("visaVendor").value;
  const optionalDetails = document.getElementById("optionalDetails").value;
  
  const visaImage = document.getElementById("visaImage").files[0];
  const sponsorCivilIdImage = document.getElementById("sponsorCivilIdImage").files[0];

  // Validate files before upload
  if (visaImage) {
    if (visaImage.size > 10 * 1024 * 1024) { // 10MB limit
      alert("Visa image file is too large. Please select a file smaller than 10MB.");
      return;
    }
    if (!visaImage.type.startsWith('image/')) {
      alert("Please select a valid image file for the visa image.");
      return;
    }
  }

  if (sponsorCivilIdImage) {
    if (sponsorCivilIdImage.size > 10 * 1024 * 1024) { // 10MB limit
      alert("Sponsor Civil ID image file is too large. Please select a file smaller than 10MB.");
      return;
    }
    if (!sponsorCivilIdImage.type.startsWith('image/')) {
      alert("Please select a valid image file for the sponsor Civil ID image.");
      return;
    }
  }

  // Function to create visa without images
  const createVisaWithoutImages = () => {
    const visaData = {
      name: visaName,
      visaNumber: visaNumber,
      passportNumber: passportNumber,
      homeCountry: homeCountry,
      sponsorName: sponsorName,
      sponsorCivilId: sponsorCivilId,
      sponsorPhone: sponsorPhone,
      visaPrice: parseFloat(visaPrice),
      visaVendor: visaVendor,
      optionalDetails: optionalDetails,
      secretaryInCharge: selectedSec,
      visaImageUrl: "",
      sponsorCivilIdImageUrl: "",
      visaStartDate: visaStartDate,
      visaIssueDate: visaIssueDate,
      expiryDate: expiryDate,
      status: "active",
      createdAt: firebase.firestore.Timestamp.now()
    };

    console.log("Creating visa without images:", visaData);

    return db.collection("secretaries")
      .doc(selectedSec)
      .collection("visas")
      .add(visaData)
      .then(() => {
        alert("Maid visa added successfully!");
        logAction('Visa Creation', `Created visa for: ${visaName} (Passport: ${passportNumber})`);
        window.location.href = 'index.html';
      })
      .catch((error) => {
        console.error("Error adding maid visa:", error);
        alert("Error adding maid visa: " + error.message);
      });
  };

  // Check if user wants to proceed without images if upload fails
  const proceedWithoutImages = !visaImage || !sponsorCivilIdImage;

     // Get visa dates
   const visaStartDateInput = document.getElementById("visaStartDateInput").value;
   const visaIssueDateInput = document.getElementById("visaIssueDate").value;
   const expiryDateInput = document.getElementById("expiryDateInput").value;
   
   if (!visaStartDateInput || !visaIssueDateInput || !expiryDateInput) {
     alert("Please set all required dates.");
     return;
   }
   
   // Validate dates before creating timestamps
   const visaStartDateObj = new Date(visaStartDateInput);
   const visaIssueDateObj = new Date(visaIssueDateInput);
   const expiryDateObj = new Date(expiryDateInput);
   
   // Check if dates are valid
   if (isNaN(visaStartDateObj.getTime()) || isNaN(visaIssueDateObj.getTime()) || isNaN(expiryDateObj.getTime())) {
     alert("Please enter valid dates in the format YYYY-MM-DD.");
     return;
   }
   
   // Check if dates are within reasonable range (not too far in past or future)
   const currentYear = new Date().getFullYear();
   const minYear = currentYear - 10;
   const maxYear = currentYear + 10;
   
   if (visaStartDateObj.getFullYear() < minYear || visaStartDateObj.getFullYear() > maxYear ||
       visaIssueDateObj.getFullYear() < minYear || visaIssueDateObj.getFullYear() > maxYear ||
       expiryDateObj.getFullYear() < minYear || expiryDateObj.getFullYear() > maxYear) {
     alert("Please enter dates within a reasonable range (between " + minYear + " and " + maxYear + ").");
     return;
   }
   
   // Create timestamps safely
   let visaStartDate, visaIssueDate, expiryDate;
   try {
     visaStartDate = firebase.firestore.Timestamp.fromDate(visaStartDateObj);
     visaIssueDate = firebase.firestore.Timestamp.fromDate(visaIssueDateObj);
     expiryDate = firebase.firestore.Timestamp.fromDate(expiryDateObj);
   } catch (error) {
     console.error("Error creating timestamps:", error);
     alert("Error processing dates. Please check your date inputs and try again.");
     return;
   }

  // Upload files with better error handling and fallback
  const uploadPromises = [];
  let visaImageUrl = "";
  let sponsorCivilIdImageUrl = "";

  // Helper function to safely upload a file
  const safeUpload = (file, folder) => {
    return new Promise((resolve) => {
      try {
        // Create a completely safe filename with timestamp and random number
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 10000);
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const safeFileName = `${folder}_${timestamp}_${randomNum}.${fileExtension}`;
        
        console.log(`Attempting to upload ${folder} with filename: ${safeFileName}`);
        
        const storageRef = storage.ref(`${folder}/${safeFileName}`);
        
        // Add metadata to help with upload
        const metadata = {
          contentType: file.type,
          cacheControl: 'public,max-age=300',
        };
        
        const uploadTask = storageRef.put(file, metadata);
        
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`${folder} upload progress: ${progress}%`);
          },
          (error) => {
            console.error(`${folder} upload error:`, error);
            console.log(`Continuing without ${folder} image due to upload failure`);
            resolve("");
          },
          () => {
            uploadTask.snapshot.ref.getDownloadURL()
              .then((url) => {
                console.log(`${folder} upload successful:`, url);
                resolve(url);
              })
              .catch((error) => {
                console.error(`Error getting ${folder} download URL:`, error);
                console.log(`Continuing without ${folder} image due to URL retrieval failure`);
                resolve("");
              });
          }
        );
      } catch (error) {
        console.error(`Error in ${folder} upload setup:`, error);
        console.log(`Continuing without ${folder} image due to setup error`);
        resolve("");
      }
    });
  };

  // Upload files with individual error handling
  if (visaImage) {
    uploadPromises.push(safeUpload(visaImage, 'visaImages'));
  }

  if (sponsorCivilIdImage) {
    uploadPromises.push(safeUpload(sponsorCivilIdImage, 'sponsorCivilIdImages'));
  }

  // If no files to upload, create visa immediately
  if (uploadPromises.length === 0) {
    console.log("No files to upload, creating visa immediately");
    createVisaWithoutImages();
    return;
  }

  // Add timeout to prevent hanging uploads
  const uploadTimeout = 30000; // 30 seconds
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      console.log("Upload timeout reached, continuing without images");
      resolve([]);
    }, uploadTimeout);
  });

  Promise.race([Promise.all(uploadPromises), timeoutPromise])
    .then((urls) => {
      console.log("File uploads completed:", urls);
      
      // Assign URLs based on what was uploaded
      if (visaImage && urls.length > 0 && urls[0]) {
        visaImageUrl = urls[0];
      }
      if (sponsorCivilIdImage && urls.length > 1 && urls[1]) {
        sponsorCivilIdImageUrl = urls[1];
      } else if (sponsorCivilIdImage && urls.length === 1 && !visaImage && urls[0]) {
        sponsorCivilIdImageUrl = urls[0];
      }
      
      // Create visa object with all new fields
      const visaData = {
        name: visaName,
        visaNumber: visaNumber,
        passportNumber: passportNumber,
        homeCountry: homeCountry,
        sponsorName: sponsorName,
        sponsorCivilId: sponsorCivilId,
        sponsorPhone: sponsorPhone,
        visaPrice: parseFloat(visaPrice),
        visaVendor: visaVendor,
        optionalDetails: optionalDetails,
        secretaryInCharge: selectedSec,
        visaImageUrl: visaImageUrl,
        sponsorCivilIdImageUrl: sponsorCivilIdImageUrl,
        visaStartDate: visaStartDate,
        visaIssueDate: visaIssueDate,
        expiryDate: expiryDate,
        status: "active",
        createdAt: firebase.firestore.Timestamp.now()
      };

      console.log("Creating visa with data:", visaData);

      return db.collection("secretaries")
        .doc(selectedSec)
        .collection("visas")
        .add(visaData);
    })
              .then(function () {
        alert("Maid visa added successfully!");
        // Log the action
        logAction('Visa Creation', `Created visa for: ${visaName} (Passport: ${passportNumber})`);
        // Redirect to index page after successful creation
        window.location.href = 'index.html';
      })
         .catch(function (error) {
       console.error("Error adding maid visa:", error);
       alert("Error adding maid visa: " + error.message);
       // Don't reset the form on error - let user fix the issue
       // Don't redirect - let user stay on the form to correct the error
     });
});

// Action functions for visa management
function viewVisaDetails(visaData) {
  try {
    console.log("Raw visa data:", visaData);
    const decodedData = decodeURIComponent(visaData);
    console.log("Decoded visa data:", decodedData);
    localStorage.setItem("selectedVisa", decodedData);
    window.location.href = "visaDetails.html";
  } catch (error) {
    console.error("Error processing visa data:", error);
    alert("Error viewing visa details. Please try again.");
  }
}

function editVisa(visaId, secretaryId) {
  // Fetch visa data and populate the edit form
  db.collection("secretaries")
    .doc(secretaryId)
    .collection("visas")
    .doc(visaId)
    .get()
    .then((doc) => {
      if (doc.exists) {
        const visa = doc.data();
        
        // Populate the edit form
        document.getElementById("editVisaId").value = visaId;
        document.getElementById("editSecretaryId").value = secretaryId;
        document.getElementById("editMaidName").value = visa.name || "";
        document.getElementById("editVisaNumber").value = visa.visaNumber || "";
        document.getElementById("editPassportNumber").value = visa.passportNumber || "";
        document.getElementById("editHomeCountry").value = visa.homeCountry || "";
        document.getElementById("editSponsorName").value = visa.sponsorName || "";
        document.getElementById("editSponsorCivilId").value = visa.sponsorCivilId || "";
        document.getElementById("editSponsorPhone").value = visa.sponsorPhone || "";
        document.getElementById("editVisaPrice").value = visa.visaPrice || "";
        document.getElementById("editVisaVendor").value = visa.visaVendor || "";
        document.getElementById("editOptionalDetails").value = visa.optionalDetails || "";
        
        // Set dates
        if (visa.visaStartDate && visa.visaStartDate.seconds) {
          const startDate = new Date(visa.visaStartDate.seconds * 1000);
          document.getElementById("editVisaStartDate").value = startDate.toISOString().split('T')[0];
        }
        if (visa.visaIssueDate && visa.visaIssueDate.seconds) {
          const issueDate = new Date(visa.visaIssueDate.seconds * 1000);
          document.getElementById("editVisaIssueDate").value = issueDate.toISOString().split('T')[0];
        }
        if (visa.expiryDate && visa.expiryDate.seconds) {
          const expiryDate = new Date(visa.expiryDate.seconds * 1000);
          document.getElementById("editExpiryDate").value = expiryDate.toISOString().split('T')[0];
        }
        
        // Show the modal
        $('#editVisaModal').modal('show');
      } else {
        alert("Visa not found!");
      }
    })
    .catch((error) => {
      console.error("Error fetching visa for edit:", error);
      alert("Error fetching visa data: " + error.message);
    });
}

function cancelVisa(visaId, secretaryId) {
  const cancelDate = prompt("Enter cancellation date (YYYY-MM-DD):");
  if (cancelDate) {
    const cancelDateObj = new Date(cancelDate);
    
    // Validate the date
    if (isNaN(cancelDateObj.getTime())) {
      alert("Please enter a valid date in the format YYYY-MM-DD.");
      return;
    }
    
    // Check if date is within reasonable range
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 10;
    const maxYear = currentYear + 10;
    
    if (cancelDateObj.getFullYear() < minYear || cancelDateObj.getFullYear() > maxYear) {
      alert("Please enter a date within a reasonable range (between " + minYear + " and " + maxYear + ").");
      return;
    }
    
    let cancelTimestamp;
    try {
      cancelTimestamp = firebase.firestore.Timestamp.fromDate(cancelDateObj);
    } catch (error) {
      console.error("Error creating timestamp:", error);
      alert("Error processing date. Please check your input and try again.");
      return;
    }
    
    db.collection("secretaries")
      .doc(secretaryId)
      .collection("visas")
      .doc(visaId)
      .update({
        status: "cancelled",
        cancelDate: cancelTimestamp
      })
                    .then(() => {
          alert("Visa cancelled successfully!");
          // Log the action
          logAction('Visa Cancellation', `Cancelled visa (ID: ${visaId}) on ${cancelDate}`);
          // Redirect to index page after successful cancellation
          window.location.href = 'index.html';
        })
             .catch((error) => {
         console.error("Error cancelling visa:", error);
         alert("Error cancelling visa: " + error.message);
         // Don't redirect on error - let user try again
       });
  }
}

function markArrived(visaId, secretaryId) {
  const arrivalDate = prompt("Enter arrival date (YYYY-MM-DD):");
  if (arrivalDate) {
    const arrivalDateObj = new Date(arrivalDate);
    
    // Validate the date
    if (isNaN(arrivalDateObj.getTime())) {
      alert("Please enter a valid date in the format YYYY-MM-DD.");
      return;
    }
    
    // Check if date is within reasonable range
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 10;
    const maxYear = currentYear + 10;
    
    if (arrivalDateObj.getFullYear() < minYear || arrivalDateObj.getFullYear() > maxYear) {
      alert("Please enter a date within a reasonable range (between " + minYear + " and " + maxYear + ").");
      return;
    }
    
    let arrivalTimestamp;
    try {
      arrivalTimestamp = firebase.firestore.Timestamp.fromDate(arrivalDateObj);
    } catch (error) {
      console.error("Error creating timestamp:", error);
      alert("Error processing date. Please check your input and try again.");
      return;
    }
    
    db.collection("secretaries")
      .doc(secretaryId)
      .collection("visas")
      .doc(visaId)
      .update({
        status: "arrived",
        arrivalDate: arrivalTimestamp
      })
                    .then(() => {
          alert("Visa marked as arrived successfully!");
          // Log the action
          logAction('Visa Arrival', `Marked visa (ID: ${visaId}) as arrived on ${arrivalDate}`);
          // Redirect to index page after successful arrival
          window.location.href = 'index.html';
        })
             .catch((error) => {
         console.error("Error marking visa as arrived:", error);
         alert("Error marking visa as arrived: " + error.message);
         // Don't redirect on error - let user try again
       });
  }
}

function saveVisaEdit() {
  const visaId = document.getElementById("editVisaId").value;
  const secretaryId = document.getElementById("editSecretaryId").value;
  
  // Get all form values
  const visaName = document.getElementById("editMaidName").value;
  const visaNumber = document.getElementById("editVisaNumber").value;
  const passportNumber = document.getElementById("editPassportNumber").value;
  const homeCountry = document.getElementById("editHomeCountry").value;
  const sponsorName = document.getElementById("editSponsorName").value;
  const sponsorCivilId = document.getElementById("editSponsorCivilId").value;
  const sponsorPhone = document.getElementById("editSponsorPhone").value;
  const visaPrice = document.getElementById("editVisaPrice").value;
  const visaVendor = document.getElementById("editVisaVendor").value;
  const optionalDetails = document.getElementById("editOptionalDetails").value;
  
     // Get dates
   const visaStartDateInput = document.getElementById("editVisaStartDate").value;
   const visaIssueDateInput = document.getElementById("editVisaIssueDate").value;
   const expiryDateInput = document.getElementById("editExpiryDate").value;
   
   if (!visaStartDateInput || !visaIssueDateInput || !expiryDateInput) {
     alert("Please set all required dates.");
     return;
   }
   
   // Validate dates before creating timestamps
   const visaStartDateObj = new Date(visaStartDateInput);
   const visaIssueDateObj = new Date(visaIssueDateInput);
   const expiryDateObj = new Date(expiryDateInput);
   
   // Check if dates are valid
   if (isNaN(visaStartDateObj.getTime()) || isNaN(visaIssueDateObj.getTime()) || isNaN(expiryDateObj.getTime())) {
     alert("Please enter valid dates in the format YYYY-MM-DD.");
     return;
   }
   
   // Check if dates are within reasonable range (not too far in past or future)
   const currentYear = new Date().getFullYear();
   const minYear = currentYear - 10;
   const maxYear = currentYear + 10;
   
   if (visaStartDateObj.getFullYear() < minYear || visaStartDateObj.getFullYear() > maxYear ||
       visaIssueDateObj.getFullYear() < minYear || visaIssueDateObj.getFullYear() > maxYear ||
       expiryDateObj.getFullYear() < minYear || expiryDateObj.getFullYear() > maxYear) {
     alert("Please enter dates within a reasonable range (between " + minYear + " and " + maxYear + ").");
     return;
   }
   
   // Create timestamps safely
   let visaStartDate, visaIssueDate, expiryDate;
   try {
     visaStartDate = firebase.firestore.Timestamp.fromDate(visaStartDateObj);
     visaIssueDate = firebase.firestore.Timestamp.fromDate(visaIssueDateObj);
     expiryDate = firebase.firestore.Timestamp.fromDate(expiryDateObj);
   } catch (error) {
     console.error("Error creating timestamps:", error);
     alert("Error processing dates. Please check your date inputs and try again.");
     return;
   }
  
  // Update visa data
  const updateData = {
    name: visaName,
    visaNumber: visaNumber,
    passportNumber: passportNumber,
    homeCountry: homeCountry,
    sponsorName: sponsorName,
    sponsorCivilId: sponsorCivilId,
    sponsorPhone: sponsorPhone,
    visaPrice: parseFloat(visaPrice),
    visaVendor: visaVendor,
    optionalDetails: optionalDetails,
    visaStartDate: visaStartDate,
    visaIssueDate: visaIssueDate,
    expiryDate: expiryDate,
    updatedAt: firebase.firestore.Timestamp.now()
  };
  
     db.collection("secretaries")
     .doc(secretaryId)
     .collection("visas")
     .doc(visaId)
     .update(updateData)
            .then(() => {
          alert("Visa updated successfully!");
          $('#editVisaModal').modal('hide');
          // Log the action
          logAction('Visa Update', `Updated visa: ${visaName} (Passport: ${passportNumber})`);
          // Redirect to index page after successful update
          window.location.href = 'index.html';
        })
                   .catch((error) => {
        console.error("Error updating visa:", error);
        alert("Error updating visa: " + error.message);
        // Don't close modal on error - let user fix the issue
      });
}

// Log action function (to be called from other functions)
function logAction(action, details) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  const logData = {
    user: currentUser.username || 'Unknown',
    action: action,
    details: details,
    timestamp: firebase.firestore.Timestamp.now()
  };
  
  db.collection('actionsLog').add(logData)
    .catch((error) => {
      console.error('Error logging action:', error);
    });
}