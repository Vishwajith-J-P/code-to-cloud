/**
 * Client-side validation, password toggles, and AJAX auth flow (auth_validation.js)
 */

document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------
    // PASSWORD VISIBILITY TOGGLE
    // ----------------------------------------------------
    const toggleBtns = document.querySelectorAll(".password-toggle-btn");
    toggleBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const input = btn.parentElement.querySelector("input");
            const icon = btn.querySelector("i");
            
            if (input && icon) {
                if (input.type === "password") {
                    input.type = "text";
                    icon.classList.remove("bi-eye-slash");
                    icon.classList.add("bi-eye");
                } else {
                    input.type = "password";
                    icon.classList.remove("bi-eye");
                    icon.classList.add("bi-eye-slash");
                }
            }
        });
    });

    // Helper: Show Bootstrap Alert in form
    function showFormAlert(form, message, type = "danger") {
        let alertContainer = form.querySelector(".auth-alert-container");
        if (!alertContainer) {
            // Create container if it doesn't exist
            alertContainer = document.createElement("div");
            alertContainer.className = "auth-alert-container mb-3";
            form.insertBefore(alertContainer, form.firstChild);
        }
        
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show border-0 rounded-3 shadow-sm py-2.5 px-3 fs-7" role="alert">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}"></i>
                    <div>${message}</div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="padding: 0.8rem 1rem;"></button>
            </div>
        `;
    }

    // Helper: Clear Form Alerts
    function clearFormAlert(form) {
        const alertContainer = form.querySelector(".auth-alert-container");
        if (alertContainer) alertContainer.innerHTML = "";
    }

    // Email verification regex helper
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Phone verification helper
    function isValidPhone(phone) {
        // Standard length check, at least 8 digits
        return phone.replace(/\D/g, "").length >= 8;
    }

    // ----------------------------------------------------
    // CLIENT-SIDE VALIDATION & AJAX LOGIN SUBMIT
    // ----------------------------------------------------
    const loginForm = document.getElementById("glassLoginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearFormAlert(loginForm);
            
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const targetRole = loginForm.dataset.role || "customer"; // customer, vendor, admin
            
            // Client-side validations
            if (!email || !password) {
                showFormAlert(loginForm, "Please fill in all credentials.", "warning");
                return;
            }
            
            if (!isValidEmail(email)) {
                showFormAlert(loginForm, "Please enter a valid email format.", "warning");
                return;
            }

            if (password.length < 6) {
                showFormAlert(loginForm, "Password must contain at least 6 characters.", "warning");
                return;
            }
            
            // Perform submit
            try {
                const submitBtn = loginForm.querySelector("button[type='submit']");
                const origText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Signing In...`;
                
                const res = await fetch("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;
                
                if (res.status === 200) {
                    // Check if role matches the target login page
                    if (data.user.role !== targetRole) {
                        showFormAlert(loginForm, `Access Denied: This account has a '${data.user.role}' role and cannot sign in here.`, "danger");
                        // Sign them out automatically
                        await fetch("/api/logout", { method: "POST" });
                        return;
                    }
                    
                    showFormAlert(loginForm, "Logged in successfully! Loading dashboard...", "success");
                    
                    setTimeout(() => {
                        if (targetRole === "admin") {
                            window.location.href = "/admin/dashboard";
                        } else if (targetRole === "vendor") {
                            window.location.href = "/vendor/dashboard";
                        } else {
                            window.location.href = "/";
                        }
                    }, 1200);
                } else {
                    showFormAlert(loginForm, data.error || "Authentication failed. Double check inputs.", "danger");
                }
            } catch (err) {
                console.error("AJAX login failed:", err);
                showFormAlert(loginForm, "Network issue. Please try again later.", "danger");
            }
        });
    }

    // ----------------------------------------------------
    // CLIENT-SIDE VALIDATION & AJAX REGISTRATION SUBMIT
    // ----------------------------------------------------
    const registerForm = document.getElementById("glassRegisterForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearFormAlert(registerForm);
            
            const fullName = document.getElementById("fullName").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const phone = document.getElementById("phone").value.trim();
            const address = document.getElementById("address").value.trim();
            const role = document.getElementById("role").value;
            
            // Client validations
            if (!fullName || !email || !password || !phone || !address) {
                showFormAlert(registerForm, "Please fill in all registration fields.", "warning");
                return;
            }
            
            if (fullName.split(" ").length < 2) {
                showFormAlert(registerForm, "Please enter your first and last name.", "warning");
                return;
            }
            
            if (!isValidEmail(email)) {
                showFormAlert(registerForm, "Invalid email address format.", "warning");
                return;
            }
            
            if (password.length < 6) {
                showFormAlert(registerForm, "Password security: At least 6 characters required.", "warning");
                return;
            }
            
            if (!isValidPhone(phone)) {
                showFormAlert(registerForm, "Please enter a valid phone number (minimum 8 digits).", "warning");
                return;
            }
            
            try {
                const submitBtn = registerForm.querySelector("button[type='submit']");
                const origText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span>Signing Up...`;
                
                const res = await fetch("/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fullName, email, password, phone, address, role })
                });
                
                const data = await res.json();
                submitBtn.disabled = false;
                submitBtn.innerHTML = origText;
                
                if (res.status === 201) {
                    showFormAlert(registerForm, "Account registered successfully! Logging you in...", "success");
                    
                    // Auto-login customer
                    const loginRes = await fetch("/api/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, password })
                    });
                    
                    setTimeout(() => {
                        if (loginRes.status === 200) {
                            if (role === "vendor") {
                                window.location.href = "/vendor/dashboard";
                            } else if (role === "admin") {
                                window.location.href = "/admin/dashboard";
                            } else {
                                window.location.href = "/";
                            }
                        } else {
                            window.location.href = "/login";
                        }
                    }, 1200);
                } else {
                    showFormAlert(registerForm, data.error || "Registration process failed.", "danger");
                }
            } catch (err) {
                console.error("AJAX registration failed:", err);
                showFormAlert(registerForm, "Network issue. Please try again.", "danger");
            }
        });
    }
});
