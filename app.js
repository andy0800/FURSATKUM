document.addEventListener("DOMContentLoaded", function () {
  // Populate secretaries (dashboard view) and the secretary dropdown.
  loadSecretaries();
  loadSecretaryOptions();
  // Also load the filtered visas (all visas from all secretaries) into "Expiring Soon"
  loadFilteredVisas();
});

// Select DOM elements.
const secretaryList = document.getElementById("secretariesList"); // List-group for secretaries.
const secretarySelect = document.getElementById("secretarySelect");
// For the Maid Visas tab
const visaList = document.getElementById("maidVisasList");
// For the Expiring Soon tab (we use a list)
const filteredVisaList = document.getElementById("expiringVisaList");

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
    .get()
    .then((querySnapshot) => {
      visaList.innerHTML = "";
      if (querySnapshot.empty) {
        visaList.innerHTML = "<li class='list-group-item'>No visas found for this secretary.</li>";
        console.warn("No visas found for secretary ID:", secretaryId);
        return;
      }
      querySnapshot.forEach((doc) => {
        const visa = doc.data();
        const li = document.createElement("li");
        li.className = "list-group-item list-group-item-success";
        let startText = "No start date";
        if (visa.visaStartDate && visa.visaStartDate.seconds) {
          startText = new Date(visa.visaStartDate.seconds * 1000).toLocaleDateString();
        }
        li.innerHTML = `<strong>Passport:</strong> ${visa.passportNumber}<br>
                        <small>Start Date: ${startText}</small>`;
        li.onclick = function () {
          localStorage.setItem("selectedVisa", JSON.stringify(visa));
          window.location.href = "visaDetails.html";
        };
        visaList.appendChild(li);
      });
    })
    .catch((error) => console.error("Error loading visas for secretary:", error));
}

// Load all visas (regardless of secretary) for the "Expiring Soon" tab,
// sort them by expiry (end) date in ascending order, and display that date.
function loadFilteredVisas() {
  filteredVisaList.innerHTML = "";
  let allVisas = [];
  db.collection("secretaries")
    .get()
    .then((querySnapshot) => {
      const promises = [];
      querySnapshot.forEach((secretaryDoc) => {
        promises.push(
          db.collection("secretaries")
            .doc(secretaryDoc.id)
            .collection("visas")
            .get()
        );
      });
      return Promise.all(promises);
    })
    .then((results) => {
      results.forEach((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          allVisas.push(doc.data());
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
        filteredVisaList.innerHTML = "<li class='list-group-item'>No visas found.</li>";
        return;
      }
      allVisas.forEach((visa) => {
        const li = document.createElement("li");
        li.className = "list-group-item list-group-item-success";
        let endText = "No expiry date";
        if (visa.expiryDate && visa.expiryDate.seconds) {
          endText = new Date(visa.expiryDate.seconds * 1000).toLocaleDateString();
        }
        li.innerHTML = `<strong>Passport:</strong> ${visa.passportNumber} <br>
                        <small>End Date: ${endText}</small>`;
        li.onclick = function () {
          localStorage.setItem("selectedVisa", JSON.stringify(visa));
          window.location.href = "visaDetails.html";
        };
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
        loadSecretaries();
        loadSecretaryOptions();
      })
      .catch((error) => console.error("Error updating secretary:", error));
  } else {
    db.collection("secretaries").add({ name: secretaryName })
      .then(() => {
        alert("Secretary added successfully!");
        loadSecretaries();
        loadSecretaryOptions();
      })
      .catch((error) => console.error("Error adding secretary:", error));
  }
  this.reset();
});

// Maid Visa Form Submission.
document.getElementById("maidVisaForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const selectedSec = secretarySelect.value;
  if (!selectedSec) {
    alert("Please select a secretary from the dropdown.");
    return;
  }
  const visaName = document.getElementById("maidName").value;
  const visaNumber = document.getElementById("visaNumber").value;
  const passportNumber = document.getElementById("passportNumber").value;
  const homeCountry = document.getElementById("homeCountry").value;
  const file = document.getElementById("visaImage").files[0];

  // Get visa start date.
  const visaStartDateInput = document.getElementById("visaStartDateInput").value;
  if (!visaStartDateInput) {
    alert("Please set a visa start date.");
    return;
  }
  const visaStartDateObj = new Date(visaStartDateInput);
  const visaStartDate = firebase.firestore.Timestamp.fromDate(visaStartDateObj);
  
  // Get expiry date.
  const expiryDateInput = document.getElementById("expiryDateInput").value;
  if (!expiryDateInput) {
    alert("Please set an expiry date.");
    return;
  }
  const expiryDateObj = new Date(expiryDateInput);
  const expiryDate = firebase.firestore.Timestamp.fromDate(expiryDateObj);

  if (file) {
    const storageRef = storage.ref(`visaImages/${file.name}`);
    const uploadTask = storageRef.put(file);
    uploadTask.on("state_changed", null, function (error) {
      console.error("Upload error:", error);
    }, function () {
      uploadTask.snapshot.ref.getDownloadURL().then(function (downloadURL) {
        db.collection("secretaries")
          .doc(selectedSec)
          .collection("visas")
          .add({
            name: visaName,
            visaNumber: visaNumber,
            passportNumber: passportNumber,
            homeCountry: homeCountry,
            secretaryInCharge: selectedSec,
            visaImageUrl: downloadURL,
            visaStartDate: visaStartDate,
            expiryDate: expiryDate
          })
          .then(function () {
            alert("Maid visa added successfully!");
            // Refresh the visas view.
            loadVisasForSecretary(selectedSec);
            loadFilteredVisas();
          })
          .catch(function (error) {
            console.error("Error adding maid visa:", error);
          });
      });
    });
  }
  this.reset();
});