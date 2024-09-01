const forms = document.querySelector(".forms"),
      pwShowHide = document.querySelectorAll(".eye-icon"),
      links = document.querySelectorAll(".link");

pwShowHide.forEach(eyeIcon => {
    eyeIcon.addEventListener("click", () => {
        let pwFields = eyeIcon.parentElement.parentElement.querySelectorAll(".password");
        
        pwFields.forEach(password => {
            if(password.type === "password"){
                password.type = "text";
                eyeIcon.classList.replace("bx-hide", "bx-show");
                return;
            }
            password.type = "password";
            eyeIcon.classList.replace("bx-show", "bx-hide");
        })
        
    })
})      

links.forEach(link => {
    link.addEventListener("click", e => {
       e.preventDefault(); //preventing form submit
       forms.classList.toggle("show-signup");
    })
})

// document.getElementById("registerForm").addEventListener("submit", async function(event) {
//     event.preventDefault();

//     const formData = new FormData(this);
//     const data = {
//       username: formData.get("username"),
//       email: formData.get("email"),
//       password: formData.get("password")
//     };

//     try {
//       const response = await fetch("/register", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify(data)
//       });
      
//       const result = await response.json();
//       const alertBox = document.getElementById("alert");
//       const alertMessage = document.getElementById("alert-message");

//       if (result.success) {
//         alertBox.style.backgroundColor = "#4CAF50"; // Green for success
//       } else {
//         alertBox.style.backgroundColor = "#f44336"; // Red for error
//       }

//       alertMessage.textContent = result.message;
//       alertBox.style.display = "block";

//       setTimeout(() => {
//         alertBox.style.display = "none";
//       }, 3000); // Hide after 3 seconds

//     } catch (error) {
//       console.error("Error:", error);
//     }
//   });