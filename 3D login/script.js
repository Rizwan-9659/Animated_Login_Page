let rotated = false;

function rotateCube() {
    const cube = document.getElementById("cubeBox");
    rotated = !rotated;
    cube.style.transform = rotated ? "rotateY(180deg)" : "rotateY(0deg)";
}

/* BUTTON RUNS IF INPUT EMPTY */
function attemptRun(type) {
    let user, pass, email, pass2;
    let btn;

    if (type === "login") {
        user = document.getElementById("loginUser").value;
        pass = document.getElementById("loginPass").value;
        btn = document.getElementById("loginBtn");

        if (user.trim() === "" || pass.trim() === "") {
            btn.classList.add("move");
            setTimeout(() => btn.classList.remove("move"), 300);
        }
    } 
    
    else {
        user = document.getElementById("signUser").value;
        email = document.getElementById("signEmail").value;
        pass = document.getElementById("signPass").value;
        pass2 = document.getElementById("signPass2").value;
        btn = document.getElementById("signBtn");

        if (user.trim() === "" || email.trim() === "" || pass.trim() === "" || pass2.trim() === "") {
            btn.classList.add("move");
            setTimeout(() => btn.classList.remove("move"), 300);
        }
    }
}

/* SUBMIT FORM */
function submitForm(type) {
    if (type === "login") {
        let user = document.getElementById("loginUser").value.trim();
        let pass = document.getElementById("loginPass").value.trim();

        if (user === "" || pass === "") return;
        alert("Login Successful!");
    }

    else {
        let user = document.getElementById("signUser").value.trim();
        let email = document.getElementById("signEmail").value.trim();
        let pass = document.getElementById("signPass").value.trim();
        let pass2 = document.getElementById("signPass2").value.trim();

        if (user === "" || email === "" || pass === "" || pass2 === "") return;

        if (pass !== pass2) {
            alert("Passwords do not match!");
            return;
        }

        alert("Signup Successful!");
    }
}

/* MONKEY EYE — SHOW/HIDE PASSWORD */
function togglePassword(id, icon) {
    const field = document.getElementById(id);

    if (field.type === "password") {
        field.type = "text";
        field.classList.add("show-spade");
        icon.textContent = "🙉"; // open eyes
    } else {
        field.type = "password";
        field.classList.remove("show-spade");
        icon.textContent = "🙈"; // closed eyes
    }
}
